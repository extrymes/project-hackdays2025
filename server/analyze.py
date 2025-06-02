import os
from dotenv import load_dotenv
from typing import Dict, List, Any, Optional, Tuple
from analyze_tools.links import LinkSecurityAnalyzer
from analyze_tools.sender import SenderTrustAnalyzer

# Load environment variables
load_dotenv()

class EmailSecurityAnalyzer:
    """
    Comprehensive email security analyzer that combines multiple analyzers
    with configurable weights to produce a final trust score.
    """
    
    def __init__(self):
        # Initialize individual analyzers
        self.link_analyzer = LinkSecurityAnalyzer()
        self.sender_analyzer = SenderTrustAnalyzer()
        
        # Configure analyzer weights (must sum to 1.0)
        self.analyzer_weights = {
            "sender": 0.5,  # Sender analysis weight
            "links": 0.5,   # Link analysis weight
        }
        
        # Validate weights
        self._validate_weights()
    
    def _validate_weights(self):
        """Ensures analyzer weights sum to 1.0"""
        total_weight = sum(self.analyzer_weights.values())
        if not (0.99 <= total_weight <= 1.01):  # Allow small floating point errors
            raise ValueError(f"Analyzer weights must sum to 1.0, got {total_weight}")
    
    def add_analyzer(self, name: str, weight: float):
        """
        Adds a new analyzer with specified weight.
        Requires rebalancing other weights to maintain sum of 1.0.
        """
        if name in self.analyzer_weights:
            raise ValueError(f"Analyzer '{name}' already exists")
        
        # Rebalance weights to accommodate the new analyzer
        current_total = sum(self.analyzer_weights.values())
        adjustment_factor = (1.0 - weight) / current_total
        
        # Adjust existing weights
        for key in self.analyzer_weights:
            self.analyzer_weights[key] *= adjustment_factor
        
        # Add new analyzer weight
        self.analyzer_weights[name] = weight
        
        # Validate the new weights
        self._validate_weights()
    
    def analyze_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes email data using all configured analyzers and returns
        a weighted trust score with warnings.
        """
        results = {}
        warnings = []
        recommendations = []
        
        # Extract email components
        sender = email_data.get("headers", {}).get("from", "")
        html_content = email_data.get("body", {}).get("html", "")
        
        # Run sender analysis if we have a sender
        if sender and "sender" in self.analyzer_weights:
            sender_result = self.sender_analyzer.analyze(sender)
            results["sender"] = {
                "score": sender_result["trust_score"],
                "details": sender_result
            }
            
            # Add sender warnings
            if sender_result["trust_score"] < 70:
                flags = sender_result.get("flags", {})
                for flag, value in flags.items():
                    if isinstance(value, bool) and value:
                        warning = f"Sender warning: {flag.replace('_', ' ')}"
                        warnings.append(warning)
                
                # Add sender recommendations
                if sender_result["trust_score"] < 50:
                    recommendations.append("Exercise caution with this sender. Verify their identity through other channels.")
                elif sender_result["trust_score"] < 70:
                    recommendations.append("Be aware this email is from a potentially less trusted source.")
        
        # Run link analysis if we have HTML content
        if html_content and "links" in self.analyzer_weights:
            link_result = self.link_analyzer.analyze(html_content)
            
            # Convert suspicion score to trust score (100 - suspicion)
            link_trust_score = max(0, 100 - link_result["suspicion_score"])
            
            results["links"] = {
                "score": link_trust_score,
                "details": link_result
            }
            
            # Add link warnings
            warnings.extend(link_result.get("warnings", []))
            
            # Add link recommendations
            if link_result["suspicion_score"] > 50:
                recommendations.append("Do not click on links in this email. They appear to be suspicious.")
            elif link_result["suspicion_score"] > 30:
                recommendations.append("Exercise caution when clicking links in this email.")
        
        # Calculate weighted trust score
        weighted_score = self._calculate_weighted_score(results)
        
        # Generate overall recommendations
        if weighted_score < 50:
            recommendations.append("This email shows significant security concerns. Consider reporting it as suspicious.")
        
        return {
            "score": weighted_score,
            "warnings": warnings,
            "recommendations": recommendations,
            "detailed_results": results
        }
    
    def _calculate_weighted_score(self, results: Dict[str, Dict]) -> float:
        """
        Calculates a weighted trust score from individual analyzer results.
        Handles missing analyzers by redistributing weights.
        """
        # Identify which analyzers have results
        available_analyzers = [name for name in self.analyzer_weights if name in results]
        
        if not available_analyzers:
            return 50.0  # Default score when no analyzers could run
        
        # Recalculate weights for available analyzers
        total_available_weight = sum(self.analyzer_weights[name] for name in available_analyzers)
        
        if total_available_weight <= 0:
            return 50.0  # Default score when weights sum to zero
            
        # Calculate normalized weights
        normalized_weights = {
            name: self.analyzer_weights[name] / total_available_weight 
            for name in available_analyzers
        }
        
        # Calculate weighted score
        weighted_score = sum(
            results[name]["score"] * normalized_weights[name]
            for name in available_analyzers
        )
        
        return round(weighted_score, 1)


if __name__ == "__main__":
    # Example for testing
    email_data = {
        "headers": {
            "from": "suspicious-sender@unknown-domain.xyz",
            "to": "recipient@example.com",
            "subject": "Urgent: Your Account Needs Attention"
        },
        "body": {
            "text": "Click the link immediately to prevent account suspension.",
            "html": """<html><body>
                <p>Dear valued customer,</p>
                <p>We detected unusual activity on your account. Please 
                <a href='http://secure-login-portal.info/verify'>verify your credentials</a> 
                immediately to avoid account suspension.</p>
                <p>You can also <a href='http://bit.ly/2xR4n'>click here</a> for faster access.</p>
                <p>Security Team</p>
            </body></html>"""
        }
    }
    
    analyzer = EmailSecurityAnalyzer()
    result =  analyzer.analyze_email(email_data)
    
    # Print results
    print(f"Email Trust Score: {result['score']}/100")
    print("\nWarnings:")
    for warning in result["warnings"]:
        print(f"- {warning}")
    
    print("\nRecommendations:")
    for rec in result["recommendations"]:
        print(f"- {rec}")