import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import os
from dotenv import load_dotenv
import json
from openai import OpenAI
import concurrent.futures
import threading

load_dotenv()

class LinkSecurityAnalyzer:
    """
    Analyzes HTML email content for suspicious links using Google Safe Browsing API
    and LLM-based risk assessment, using the highest threat level found.
    """
    
    def __init__(self, max_workers=10):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("Google Safe Browsing API key not found. Please set GOOGLE_API_KEY in .env file.")
        self.safe_browsing_url = "https://safebrowsing.googleapis.com/v4/threatMatches:find"
        self.max_workers = max_workers
        self.thread_local = threading.local()
        
        # Initialize LLM client
        self.llm_api_key = os.getenv("API_KEY")
        if not self.llm_api_key:
            print("⚠️ Warning: LLM API key not found. LLM-based analysis will be skipped.")
        self.llm_client = OpenAI(
            base_url='https://albert.api.etalab.gouv.fr/v1',
            api_key=self.llm_api_key
        ) if self.llm_api_key else None

    def extract_links(self, html_content):
        """Extract all links from HTML content"""
        soup = BeautifulSoup(html_content, 'html.parser')
        links = []

        # Extract links from anchor tags
        for tag in soup.find_all('a'):
            if tag.has_attr('href'):
                url = tag['href'].strip()
                if not url or url.startswith(('data:', 'javascript:', '#')):
                    continue
                    
                # Normalize URL if it starts with 'www.'
                if url.startswith('www.'):
                    url = 'http://' + url
                    
                links.append({
                    'url': url,
                    'text': tag.get_text().strip(),
                    'type': 'explicit'
                })

        # Extract links from image tags
        for tag in soup.find_all('img'):
            if tag.has_attr('src'):
                url = tag['src'].strip()
                if not url or url.startswith(('data:', 'javascript:', '#')):
                    continue
                    
                if url.startswith('www.'):
                    url = 'http://' + url
                    
                links.append({
                    'url': url,
                    'text': tag.get('alt', ''),
                    'type': 'image'
                })

        # Extract URLs from CSS
        style_urls = re.findall(r'url\(["\']?(.*?)["\']?\)', html_content)
        for url in style_urls:
            url = url.strip()
            if url and not url.startswith(('data:', 'javascript:', '#')):
                if url.startswith('www.'):
                    url = 'http://' + url
                links.append({'url': url, 'text': '', 'type': 'style'})

        # Add basic domain information for each link
        for link in links:
            parsed = urlparse(link['url'])
            link['domain'] = parsed.netloc
            
        return links

    def _check_google_safe_browsing(self, urls):
        """Check URLs against Google Safe Browsing API"""
        results = {}
        
        payload = {
            'client': {'clientId': 'email-security-scanner', 'clientVersion': '1.0'},
            'threatInfo': {
                'threatTypes': ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
                'platformTypes': ['ANY_PLATFORM'],
                'threatEntryTypes': ['URL'],
                'threatEntries': [{'url': u} for u in urls]
            }
        }

        try:
            res = requests.post(self.safe_browsing_url, params={'key': self.api_key}, json=payload)
            res.raise_for_status()
            matches = res.json().get('matches', [])
            
            # Default: all URLs are safe unless found in matches
            for url in urls:
                results[url] = {'is_safe': True, 'risk_score': 0, 'threats': []}
            
            # Update with any matches found
            for match in matches:
                url = match['threat']['url']
                threat_type = match['threatType']
                if url in results:
                    results[url]['is_safe'] = False
                    results[url]['risk_score'] = 100
                    results[url]['threats'].append(f"Safe Browsing: {threat_type}")
            
            return results
            
        except requests.RequestException as e:
            print(f"⚠️ Error contacting Safe Browsing API: {e}")
            return {url: {'is_safe': None, 'error': 'API error', 'risk_score': 0, 'threats': []} for url in urls}

    def _analyze_with_llm(self, link):
        """Analyze a link using LLM to detect security risks - simplified version"""
        if not self.llm_client:
            return None
            
        try:
            # Create a simplified prompt focused on just getting a risk score
            prompt = f"""
            SECURITY TASK: Analyze this URL for security risks. Return ONLY a risk score.
            
            URL: {link['url']}
            Domain: {link.get('domain', 'N/A')}
            Display Text: {link.get('text', 'N/A')}
            
            Be vigilant for:
            - URL shorteners (bit.ly, tinyurl, etc)
            - IP addresses in URLs
            - Typosquatting domains
            - Link text not matching URL destination
            - Suspicious TLDs
            - Deceptive paths

            Respond with ONLY a valid JSON object:
            {{"risk_score": <integer between 0-100, 0 is most dangerous, 100 is completely safe>}}
            
            Higher risk score = more dangerous. Be strict with scoring.
            """

            response = self.llm_client.chat.completions.create(
                model="albert-small",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "You are a cybersecurity URL analyzer. Respond ONLY with a risk score JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=200  # Reduced token count for faster response
            )

            # Process the response
            content = response.choices[0].message.content.strip()
            
            # Clean up any markdown formatting
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            # Parse the JSON response
            result = json.loads(content)
            
            # Simplified result - note that 0 is highest risk, 100 is safest
            risk_score = result.get('risk_score', 50)  # Default to medium risk if not found
            
            return {
                'risk_score': risk_score,
                'is_safe': risk_score >= 50,  # Safe if score is 50 or above
                'threats': ["Suspicious link"] if risk_score < 50 else []
            }
            
        except Exception as e:
            print(f"⚠️ Error during LLM analysis: {e}")
            return None

    def _get_session(self):
        """Get thread-local session for improved HTTP performance"""
        if not hasattr(self.thread_local, "session"):
            self.thread_local.session = requests.Session()
        return self.thread_local.session

    def _process_link(self, link, safe_browsing_results):
        """Process a single link with both Safe Browsing and LLM analysis"""
        url = link['url']
        
        # Start with Google Safe Browsing results
        link_result = {**link, **safe_browsing_results.get(url, 
            {'is_safe': None, 'risk_score': 0, 'threats': []})}
        
        # If GSB already found it unsafe, skip LLM analysis
        if not link_result['is_safe']:
            return link_result
            
        # Run LLM analysis only if GSB didn't find issues
        if self.llm_client:
            llm_result = self._analyze_with_llm(link)
            
            if llm_result:
                # Take the highest risk score between Google and LLM
                gsb_risk = link_result['risk_score']
                llm_risk = llm_result.get('risk_score', 0)
                link_result['risk_score'] = max(gsb_risk, llm_risk)
                
                # If LLM considers it unsafe, mark it unsafe and add the generic threat
                if not llm_result.get('is_safe', True):
                    link_result['is_safe'] = False
                    if llm_result.get('threats'):
                        link_result['threats'].extend(llm_result['threats'])
        
        return link_result

    def check_links_safety(self, links):
        """Analyze links using both Google Safe Browsing and LLM"""
        if not links:
            return []
            
        # Extract URLs for Google Safe Browsing check
        urls = [link['url'] for link in links]
        
        # Check with Google Safe Browsing API
        safe_browsing_results = self._check_google_safe_browsing(urls)
        
        # Process links in parallel
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_link = {
                executor.submit(self._process_link, link, safe_browsing_results): link 
                for link in links
            }
            
            # Process results as they complete
            for future in concurrent.futures.as_completed(future_to_link):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as exc:
                    link = future_to_link[future]
                    print(f"⚠️ Error processing link {link['url']}: {exc}")
                    # Add a failed result
                    results.append({
                        **link, 
                        'is_safe': None, 
                        'risk_score': 0, 
                        'threats': [],
                        'error': str(exc)
                    })
            
        return results

    def calculate_email_suspicion_score(self, links):
        """Calculate overall email suspicion score based on links"""
        if not links:
            return 0
            
        # Use the maximum risk score of any link as the overall score
        max_risk = max((link.get('risk_score', 0) for link in links), default=0)
        return max_risk

    def analyze(self, html_content):
        """Main analysis method"""
        links = self.extract_links(html_content)
        checked_links = self.check_links_safety(links)
        suspicion_score = self.calculate_email_suspicion_score(checked_links)
        
        # Generate warnings for suspicious links
        warnings = []
        suspicious_links = [link['url'] for link in checked_links if link.get('is_safe') is False]
        if suspicious_links:
            warning_text = "suspicious link(s) :\n" + "\n".join([f"- {link}" for link in suspicious_links])
            warnings.append(warning_text)
        
        return {
            "links_found": len(checked_links),
            "suspicion_score": suspicion_score,
            "links": checked_links,
            "warnings": warnings
        }


if __name__ == "__main__":
    print("\n🔍 Link Security Analyzer")
    analyzer = LinkSecurityAnalyzer()
    
    html_input = input("Enter HTML content or file path: ").strip()
    if os.path.exists(html_input):
        with open(html_input, 'r', encoding='utf-8') as f:
            html_input = f.read()

    print("\nAnalyzing...")
    result = analyzer.analyze(html_input)

    print(f"\n📊 Email Suspicion Score: {result['suspicion_score']} / 100")
    print(f"🔗 Total Links Found: {result['links_found']}")

    print("\n📋 Link Details:")
    for link in result['links']:
        status = "SAFE ✅" if link['is_safe'] else "SUSPICIOUS ❌" if link['is_safe'] is False else "UNKNOWN ❓"
        threats = f" | {', '.join(link['threats'])}" if link['threats'] else ""
        print(f"- {link['url']} ({status} | Risk: {link['risk_score']}/100){threats}")

    print(result['warnings'] if result['warnings'] else "No warnings.")