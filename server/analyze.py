import os
import json
import threading
import pprint
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from typing import Dict, List, Any, Optional, Tuple, Callable
from analyze_tools.links import LinkSecurityAnalyzer
from analyze_tools.sender import SenderTrustAnalyzer
from message_analyzer import analyze_language_grammar, analyze_ton_manipulation, analyze_sensitive_info_request

# Load environment variables
load_dotenv()

class EmailSecurityAnalyzer:
    """
    Comprehensive email security analyzer that combines multiple analyzers
    with configurable weights to produce a final trust score.
    
    Each analyzer runs in its own thread for improved performance.
    """
    
    def __init__(self, debug_mode=True):
        # Enable detailed output for debugging
        self.debug_mode = debug_mode
        
        # Dictionary of analyzers with their configuration
        self.analyzers = {
            "sender": {
                "instance": SenderTrustAnalyzer(),
                "weight": 0.4,
                "extract_data": lambda email_data: email_data.get("headers", {}).get("from", ""),
                "process_result": lambda result, warnings, recommendations: self._process_result("sender", result, warnings, recommendations),
                "threshold_moderate": 70,
                "threshold_severe": 50,
                "critical_threshold": 30  # If below this, treat as critical security concern
            },
            "links": {
                "instance": LinkSecurityAnalyzer(),
                "weight": 0.3, 
                "extract_data": lambda email_data: email_data.get("body", {}).get("html", ""),
                "process_result": lambda result, warnings, recommendations: self._process_result("links", result, warnings, recommendations),
                "threshold_moderate": 30,  # For suspicion score (inverted)
                "threshold_severe": 50,     # For suspicion score (inverted)
                "critical_threshold": 70  # If suspicion above this, treat as critical
            }
        }
        
        # Add message analyzers if available
        try:
            self._add_message_analyzers()
        except ImportError:
            if self.debug_mode:
                print("Message analyzer modules not available, skipping...")
        
        # Validate weights
        self._validate_weights()
        
        # Critical security factor - how much to weight critical concerns
        self.critical_weight_multiplier = 2.5
    
    def _add_message_analyzers(self):
        """Add message content analyzers if the modules are available"""
        message_analyzers = {
            "language": {
                "analyze_func": analyze_language_grammar,
                "weight": 0.1,
                "extract_data": lambda email_data: email_data.get("body", {}).get("text", "") or 
                                                  email_data.get("body", {}).get("html", ""),
                "process_result": lambda result, warnings, recommendations: self._process_result("language", result, warnings, recommendations),
                "threshold_moderate": 30,
                "threshold_severe": 60,
                "critical_threshold": 80
            },
            "tone": {
                "analyze_func": analyze_ton_manipulation,
                "weight": 0.1,
                "extract_data": lambda email_data: email_data.get("body", {}).get("text", "") or 
                                                 email_data.get("body", {}).get("html", ""),
                "process_result": lambda result, warnings, recommendations: self._process_result("tone", result, warnings, recommendations),
                "threshold_moderate": 30,
                "threshold_severe": 60,
                "critical_threshold": 80
            },
            "sensitive_info": {
                "analyze_func": analyze_sensitive_info_request,
                "weight": 0.1,
                "extract_data": lambda email_data: email_data.get("body", {}).get("text", "") or 
                                                 email_data.get("body", {}).get("html", ""),
                "process_result": lambda result, warnings, recommendations: self._process_result("sensitive_info", result, warnings, recommendations),
                "threshold_moderate": 30,
                "threshold_severe": 60,
                "critical_threshold": 80
            }
        }
        
        # Need to rebalance weights when adding multiple analyzers
        self._add_multiple_analyzers(message_analyzers)
    
    def _add_multiple_analyzers(self, analyzers_dict):
        """Add multiple analyzers at once, adjusting weights appropriately"""
        if not analyzers_dict:
            return
            
        # Calculate total weight to add
        total_new_weight = sum(config["weight"] for config in analyzers_dict.values())
        
        # Current total weight
        current_total = sum(analyzer["weight"] for analyzer in self.analyzers.values())
        
        # Adjust current analyzers by factor to make room for new ones
        adjustment_factor = (1.0 - total_new_weight) / current_total
        
        # Adjust existing weights
        for key in self.analyzers:
            self.analyzers[key]["weight"] *= adjustment_factor
            
        # Add new analyzers
        self.analyzers.update(analyzers_dict)
        
        # Validate the new weights
        self._validate_weights()
    
    def _validate_weights(self):
        """Ensures analyzer weights sum to 1.0"""
        total_weight = sum(analyzer["weight"] for analyzer in self.analyzers.values())
        if not (0.99 <= total_weight <= 1.01):  # Allow small floating point errors
            raise ValueError(f"Analyzer weights must sum to 1.0, got {total_weight}")
    
    def register_analyzer(self, name: str, analyzer_instance: Any = None, analyze_func: Callable = None, 
                         weight: float = 0.1, extract_data_func: Callable = None, process_result_func: Callable = None,
                         threshold_moderate: float = 70, threshold_severe: float = 50, critical_threshold: float = 30):
        """
        Registers a new analyzer with the system
        
        Args:
            name: Unique identifier for the analyzer
            analyzer_instance: The analyzer object with an analyze() method
            analyze_func: Alternative function-based analyzer
            weight: Weight of this analyzer in the overall score (0.0-1.0)
            extract_data_func: Function to extract relevant data from email
            process_result_func: Function to process the analyzer's raw results
            threshold_moderate: Threshold for moderate warnings
            threshold_severe: Threshold for severe warnings
            critical_threshold: Threshold for critical security concerns
        """
        if name in self.analyzers:
            raise ValueError(f"Analyzer '{name}' already exists")
            
        if not (analyzer_instance or analyze_func):
            raise ValueError("Either analyzer_instance or analyze_func must be provided")
            
        if not extract_data_func:
            raise ValueError("extract_data_func is required")
            
        if not process_result_func:
            raise ValueError("process_result_func is required")
        
        # Rebalance weights to accommodate the new analyzer
        current_total = sum(analyzer["weight"] for analyzer in self.analyzers.values())
        adjustment_factor = (1.0 - weight) / current_total
        
        # Adjust existing weights
        for key in self.analyzers:
            self.analyzers[key]["weight"] *= adjustment_factor
        
        # Add new analyzer
        self.analyzers[name] = {
            "instance": analyzer_instance,
            "analyze_func": analyze_func,
            "weight": weight,
            "extract_data": extract_data_func,
            "process_result": process_result_func,
            "threshold_moderate": threshold_moderate,
            "threshold_severe": threshold_severe,
            "critical_threshold": critical_threshold
        }
        
        # Validate the new weights
        self._validate_weights()
    
    def _process_result(self, analyzer_name, result, warnings, recommendations):
        """
        Unified processor for analyzer results
        
        Args:
            analyzer_name: Name of the analyzer
            result: Raw result from the analyzer
            warnings: List to append warnings to
            recommendations: List to append recommendations to
            
        Returns:
            Dict containing processed result with score, details, and critical flag
        """
        analyzer_config = self.analyzers[analyzer_name]
        score = result.get("score", 0)
        is_critical = False
        
        # Process based on analyzer type
        if analyzer_name == "sender":
            # Handle sender analyzer
            is_critical = score < analyzer_config["critical_threshold"]
            
            if score < analyzer_config["threshold_moderate"]:
                flags = result.get("flags", {})
                for flag, value in flags.items():
                    if isinstance(value, bool) and value:
                        warning = f"Sender warning: {flag.replace('_', ' ')}"
                        warnings.append(warning)
                
                if score < analyzer_config["threshold_severe"]:
                    recommendations.append("Exercise caution with this sender. Verify their identity through other channels.")
                else:
                    recommendations.append("Be aware this email is from a potentially less trusted source.")
        
        elif analyzer_name == "links":
            # Handle links analyzer
            is_critical = score < analyzer_config["critical_threshold"]
            
            # Add warnings
            warnings.extend(result.get("warnings", []))
            
            # Add recommendations based on suspicion thresholds
            if score < analyzer_config["threshold_severe"]:
                recommendations.append("Do not click on links in this email. They appear to be suspicious.")
            elif score > analyzer_config["threshold_moderate"]:
                recommendations.append("Exercise caution when clicking links in this email.")
        
        else:
            # Handle message content analyzers and any other analyzers
            is_critical = score <= 20  # Critical if very suspicious
            
            # Add warnings with type prefix if not from known analyzers
            prefix = "Content warning: " if analyzer_name in ["language", "tone", "sensitive_info"] else f"{analyzer_name.capitalize()} warning: "
            warnings.extend([f"{prefix}{warning}" for warning in result.get("warnings", [])])
            
            # Add recommendations based on trust score thresholds
            if score <= 30:  # High suspicion
                recommendations.append("This message contains highly suspicious content. Verify any requests through official channels.")
            elif score <= 60:  # Moderate suspicion
                recommendations.append("Exercise caution with the content of this message.")
        
        return {
            "score": score,
            "details": result,
            "critical": is_critical
        }
    
    def _run_analyzer(self, name, analyzer_config, email_data, shared_results, shared_warnings, shared_recommendations):
        """Run a single analyzer in its own thread and store results in shared collections"""
        # Extract relevant data for this analyzer
        data = analyzer_config["extract_data"](email_data)
        
        # Skip if no data is available for analysis
        if not data:
            if self.debug_mode:
                print(f"[DEBUG] {name}: No data available for analysis")
            return
        
        try:
            # Run analysis
            if "analyze_func" in analyzer_config and analyzer_config["analyze_func"]:
                # Function-based analyzer
                raw_result = analyzer_config["analyze_func"](data)
            else:
                # Object-based analyzer with analyze() method
                raw_result = analyzer_config["instance"].analyze(data)
            
            if not raw_result:
                if self.debug_mode:
                    print(f"[DEBUG] {name}: Analyzer returned empty result")
                return
                
            # Process results and extract warnings/recommendations
            local_warnings = []
            local_recommendations = []
            processed_result = analyzer_config["process_result"](raw_result, local_warnings, local_recommendations)
            
            # Store results in shared collections using thread-safe approach
            with threading.Lock():
                shared_results[name] = processed_result
                shared_warnings.extend(local_warnings)
                shared_recommendations.extend(local_recommendations)
                
        except Exception as e:
            error_msg = f"Analyzer error ({name}): {str(e)}"
            if self.debug_mode:
                import traceback
                print(f"[DEBUG] {error_msg}")
                print(traceback.format_exc())
            with threading.Lock():
                shared_warnings.append(error_msg)
    
    def analyze_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes email data using all configured analyzers in parallel threads
        and returns a weighted trust score with warnings.
        """
        results = {}
        warnings = []
        recommendations = []
        timing_info = {}
        
        # Use ThreadPoolExecutor to run analyzers in parallel
        with ThreadPoolExecutor(max_workers=len(self.analyzers)) as executor:
            futures = {}
            
            # Submit all analyzer tasks
            for name, config in self.analyzers.items():
                import time
                start_time = time.time()
                future = executor.submit(
                    self._run_analyzer, 
                    name, config, email_data, results, warnings, recommendations
                )
                futures[future] = (name, start_time)
            
            # Wait for all analyzers to complete
            for future in as_completed(futures):
                name, start_time = futures[future]
                timing_info[name] = round((time.time() - start_time) * 1000)  # milliseconds
                
                # Handle any exceptions from threads
                try:
                    future.result()
                except Exception as e:
                    warnings.append(f"Analyzer error ({name}): {str(e)}")
        
        # Calculate weighted trust score with priority for critical concerns
        weighted_score, critical_concerns = self._calculate_weighted_score(results)
        
        # Generate overall recommendations
        if weighted_score < 50:
            recommendations.append("This email shows significant security concerns. Consider reporting it as suspicious.")
        
        # Prepare result
        analysis_result = {
            "score": weighted_score,
            "warnings": warnings,
            "recommendations": list(set(recommendations)),  # Remove duplicates
            "detailed_results": results
        }
        
        # Add critical concerns if any
        if critical_concerns:
            analysis_result["critical_concerns"] = critical_concerns
        
        # Print debug information if enabled
        if self.debug_mode:
            self._print_debug_output(analysis_result, timing_info)
        
        return analysis_result
    
    def _calculate_weighted_score(self, results: Dict[str, Dict]) -> Tuple[float, List[str]]:
        """
        Calculates a weighted trust score from individual analyzer results.
        The analyzer with lowest score (highest risk) has 4x weight impact.
        Returns both the score and a list of critical concerns.
        """
        # Identify which analyzers have results
        available_analyzers = [name for name in self.analyzers if name in results]
        
        if not available_analyzers:
            return 50.0, []  # Default score when no analyzers could run
        
        # Identify critical security concerns
        critical_concerns = [
            name for name in available_analyzers 
            if results[name].get("critical", False)
        ]
        
        # Start with base weights
        weights = {name: self.analyzers[name]["weight"] for name in available_analyzers}
        
        # Find analyzer with lowest score and multiply its weight by 4
        lowest_score_analyzer = min(available_analyzers, key=lambda x: results[x]["score"])
        weights[lowest_score_analyzer] *= 4.0
        
        # If we have critical concerns, boost their weights
        if critical_concerns:
            # Calculate what portion of weight should go to critical concerns
            critical_weight_portion = min(0.7, len(critical_concerns) * 0.2)  # Cap at 70%
            non_critical_weight_portion = 1.0 - critical_weight_portion
            
            # Get non-critical analyzers
            non_critical = [name for name in available_analyzers if name not in critical_concerns]
            
            # Calculate original weight totals
            original_critical_weight = sum(weights[name] for name in critical_concerns)
            original_non_critical_weight = sum(weights[name] for name in non_critical)
            
            # Adjust weights if we have any critical concerns
            if original_critical_weight > 0:
                # Scale critical weights
                for name in critical_concerns:
                    weights[name] = (weights[name] / original_critical_weight) * critical_weight_portion
                
                # Scale non-critical weights
                if original_non_critical_weight > 0 and non_critical:
                    for name in non_critical:
                        weights[name] = (weights[name] / original_non_critical_weight) * non_critical_weight_portion
        
        # Normalize weights to ensure they sum to 1.0
        total_weight = sum(weights.values())
        if total_weight <= 0:
            return 50.0, critical_concerns
            
        normalized_weights = {name: weights[name] / total_weight for name in available_analyzers}
        
        # Calculate weighted score
        weighted_score = sum(
            results[name]["score"] * normalized_weights[name]
            for name in available_analyzers
        )
        
        # Cap maximum score if we have critical concerns
        if critical_concerns:
            min_critical_score = min(results[name]["score"] for name in critical_concerns)
            weighted_score = min(weighted_score, min_critical_score * 1.2)
        
        return round(weighted_score, 1), critical_concerns
    
    def _print_debug_output(self, result, timing_info):
        """
        Print detailed debug information about analyzer results
        in a beautifully formatted way
        """
        print("\n" + "="*80)
        print(" "*30 + "EMAIL SECURITY ANALYSIS" + " "*30)
        print("="*80)
        
        # Print overall score
        score = result["score"]
        score_color = self._get_score_color(score)
        print(f"\nOVERALL TRUST SCORE: {score_color}{score}/100\033[0m")
        
        # Print critical concerns if any
        if "critical_concerns" in result and result["critical_concerns"]:
            print("\n\033[1;31mCRITICAL SECURITY CONCERNS:\033[0m")
            for concern in result["critical_concerns"]:
                print(f"  • \033[1;31m{concern}\033[0m")
        
        # Print individual analyzer results
        print("\nINDIVIDUAL ANALYZER RESULTS:")
        print("-"*80)
        
        for name, details in result["detailed_results"].items():
            score = details["score"]
            is_critical = details.get("critical", False)
            weight = self.analyzers[name]["weight"]
            execution_time = timing_info.get(name, 0)
            
            # Color coding based on score
            score_color = self._get_score_color(score)
            
            # Print analyzer header with score
            print(f"\n\033[1m{name.upper()}\033[0m")
            print(f"  Score: {score_color}{score}/100\033[0m")
            print(f"  Base Weight: {weight:.2f}")
            print(f"  Execution Time: {execution_time}ms")
            
            if is_critical:
                print("  \033[1;31m[CRITICAL SECURITY CONCERN]\033[0m")
            
            # Print analyzer specific details
            print("  Details:")
            self._print_nested_dict(details["details"], indent=4)
        
        # Print warnings
        if result["warnings"]:
            print("\n\033[1mWARNINGS:\033[0m")
            for warning in result["warnings"]:
                print(f"  • \033[33m{warning}\033[0m")
        
        # Print recommendations
        if result["recommendations"]:
            print("\n\033[1mRECOMMENDATIONS:\033[0m")
            for rec in result["recommendations"]:
                print(f"  • \033[36m{rec}\033[0m")
                
        print("\n" + "="*80)
    
    def _get_score_color(self, score):
        """Get ANSI color code based on score"""
        if score < 40:
            return "\033[1;31m"  # Bold Red
        elif score < 60:
            return "\033[33m"     # Yellow
        elif score < 80:
            return "\033[32m"     # Green
        else:
            return "\033[1;32m"   # Bold Green
            
    def _print_nested_dict(self, obj, indent=0):
        """Pretty print a nested dictionary or list"""
        space = ' ' * indent
        
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, (dict, list)):
                    print(f"{space}{k}:")
                    self._print_nested_dict(v, indent + 2)
                else:
                    print(f"{space}{k}: {v}")
        elif isinstance(obj, list):
            for item in obj:
                if isinstance(item, (dict, list)):
                    self._print_nested_dict(item, indent + 2)
                else:
                    print(f"{space}- {item}")
        else:
            print(f"{space}{obj}")


if __name__ == "__main__":
    # Example for testing
    email_data = {
        "headers": {
            "from": "suspicious-sender@unknown-domain.xyz",
            "to": "recipient@example.com",
            "subject": "Urgent: Your Account Needs Attention"
        },
        "body": {
            "text": "Dear valued customer, We detected unusual activity on your account. Please verify your credentials immediately to avoid account suspension. Visit our secure portal or provide your username and password by reply. This is URGENT! Your account will be closed within 24 hours if you don't respond!",
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
    
    # Create analyzer with debug mode enabled
    analyzer = EmailSecurityAnalyzer(debug_mode=True)
    
    # Run analysis
    result = analyzer.analyze_email(email_data)
    
    # When debug_mode is False, we can still print simple results
    if not analyzer.debug_mode:
        print(f"Email Trust Score: {result['score']}/100")
        print("\nWarnings:")
        for warning in result["warnings"]:
            print(f"- {warning}")
        
        print("\nRecommendations:")
        for rec in result["recommendations"]:
            print(f"- {rec}")