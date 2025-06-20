import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import os
from dotenv import load_dotenv
import json
from analyze_tools.model import LLMClient
import concurrent.futures
import threading
import socket
import dns.resolver
from analyze_tools.prompts import links_check_prompt

load_dotenv()

class LinkSecurityAnalyzer:
    """
    Analyzes HTML email content for suspicious links using Spamhaus DBL
    and LLM-based risk assessment, using the highest threat level found.
    """
    
    def __init__(self, max_workers=10):
        self.spamhaus_dbl = "dbl.spamhaus.org"
        self.max_workers = max_workers
        self.thread_local = threading.local()
        
        # Initialize LLM client
        self.llm_client = LLMClient()
        
        # Initialize DNS resolver
        self.resolver = dns.resolver.Resolver()
        self.resolver.timeout = 5
        self.resolver.lifetime = 5

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

    def _check_spamhaus(self, urls):
        """Check URLs against Spamhaus DBL"""
        results = {}
        
        # Default: all URLs are safe unless found in blocklist
        for url in urls:
            results[url] = {'is_safe': True, 'risk_score': 100, 'threats': []}
        
        # Spamhaus codes and their meanings
        spamhaus_codes = {
            "127.0.1.2": "Spamhaus DBL - Spam domain",
            "127.0.1.4": "Spamhaus DBL - Phishing domain",
            "127.0.1.5": "Spamhaus DBL - Malware domain",
            "127.0.1.6": "Spamhaus DBL - Botnet C&C domain",
            "127.0.1.102": "Spamhaus DBL - Abused legit spam",
            "127.0.1.103": "Spamhaus DBL - Abused spammed redirector domain",
            "127.0.1.104": "Spamhaus DBL - Abused legit phish",
            "127.0.1.105": "Spamhaus DBL - Abused legit malware",
            "127.0.1.106": "Spamhaus DBL - Abused legit botnet C&C",
            "127.0.1.255": "Spamhaus DBL - Test point"
        }
        
        for url in urls:
            try:
                # Extract domain from URL
                domain = urlparse(url).netloc
                if not domain:
                    continue
                
                # Remove port if present
                if ':' in domain:
                    domain = domain.split(':')[0]
                
                # Prepare for Spamhaus DBL lookup
                lookup_domain = f"{domain}.{self.spamhaus_dbl}"
                
                try:
                    answers = self.resolver.resolve(lookup_domain, 'A')
                    
                    # If we get here, domain is listed in Spamhaus DBL
                    for rdata in answers:
                        ip = rdata.address
                        if ip in spamhaus_codes:
                            results[url]['is_safe'] = False
                            results[url]['risk_score'] = 0  # 0 = most dangerous
                            results[url]['threats'].append(spamhaus_codes[ip])
                
                except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
                    # Domain not listed - this is good
                    pass
                    
                except dns.resolver.Timeout:
                    print(f"⚠️ Timeout checking domain {domain} with Spamhaus")
                    
            except Exception as e:
                print(f"⚠️ Error checking URL {url} with Spamhaus: {e}")
                
        return results

    def _analyze_with_llm(self, link):
        """Analyze a link using LLM to detect security risks"""
        try:
            # Create prompt focused on getting a risk score
            prompt = links_check_prompt(link)

            result = self.llm_client.call_json(
                prompt=prompt,
                system_prompt="You are a cybersecurity URL analyzer. Respond ONLY with a risk score JSON.",
                temperature=0.1,
                max_tokens=200
            )
            
            if not result:
                return None
                
            # Simplified result - note that 0 is highest risk, 100 is safest
            risk_score = result.get('risk_score', 50)  # Default to medium risk if not found
            
            return {
                'risk_score': risk_score,
                'is_safe': risk_score > 50,  # Safe only if score is above 50
                'threats': ["Suspicious link"] if risk_score <= 50 else []
            }
            
        except Exception as e:
            print(f"⚠️ Error during LLM analysis: {e}")
            return None

    def _get_session(self):
        """Get thread-local session for improved HTTP performance"""
        if not hasattr(self.thread_local, "session"):
            self.thread_local.session = requests.Session()
        return self.thread_local.session

    def _process_link(self, link, spamhaus_results):
        """Process a single link with both Spamhaus and LLM analysis"""
        url = link['url']
        
        # Start with Spamhaus results
        link_result = {**link, **spamhaus_results.get(url, 
            {'is_safe': None, 'risk_score': 100, 'threats': []})}
        
        # If Spamhaus already found it unsafe, skip LLM analysis
        if not link_result['is_safe']:
            return link_result
            
        # Run LLM analysis only if Spamhaus didn't find issues
        if self.llm_client:
            llm_result = self._analyze_with_llm(link)
            
            if llm_result:
                # Take the lowest risk score between Spamhaus and LLM
                # (lower score = more dangerous)
                spamhaus_risk = link_result['risk_score']
                llm_risk = llm_result.get('risk_score', 100)
                link_result['risk_score'] = min(spamhaus_risk, llm_risk)
                
                # If LLM considers it unsafe, mark it unsafe and add the generic threat
                if not llm_result.get('is_safe', True):
                    link_result['is_safe'] = False
                    if llm_result.get('threats'):
                        link_result['threats'].extend(llm_result['threats'])
        
        return link_result

    def check_links_safety(self, links):
        """Analyze links using both Spamhaus and LLM"""
        if not links:
            return []
            
        # Extract URLs for Spamhaus check
        urls = [link['url'] for link in links]
        
        # Check with Spamhaus DBL
        spamhaus_results = self._check_spamhaus(urls)
        
        # Process links in parallel
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_link = {
                executor.submit(self._process_link, link, spamhaus_results): link 
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
                        'risk_score': 100,
                        'threats': [],
                        'error': str(exc)
                    })
            
        return results

    def calculate_email_score(self, links):
        """Calculate overall email suspicion score based on links"""
        if not links:
            return 100  # No links = completely safe
            
        # Use the minimum risk score of any link as the overall score
        # Since 0 = most dangerous, we want the lowest value
        min_risk = min((link.get('risk_score', 100) for link in links), default=100)
        return min_risk

    def analyze(self, html_content):
        """Main analysis method"""
        links = self.extract_links(html_content)
        checked_links = self.check_links_safety(links)
        score = self.calculate_email_score(checked_links)
        
        # Generate warnings for suspicious links
        warnings = []
        suspicious_links = [link['url'] for link in checked_links if link.get('is_safe') is False]
        if suspicious_links:
            warnings.append("Lien(s) suspicieux détecté(s)")
        
        return {
            "links_found": len(checked_links),
            "score": score,  # Lower score = more dangerous
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

    print(f"\n📊 Email Suspicion Score: {result['score']} / 100")
    print(f"🔗 Total Links Found: {result['links_found']}")

    print("\n📋 Link Details:")
    for link in result['links']:
        status = "SAFE ✅" if link['is_safe'] else "SUSPICIOUS ❌" if link['is_safe'] is False else "UNKNOWN ❓"
        threats = f" | {', '.join(link['threats'])}" if link['threats'] else ""
        print(f"- {link['url']} ({status} | Risk: {link['risk_score']}/100){threats}")

    print(result['warnings'] if result['warnings'] else "No warnings.")