import os
import json
from typing import Dict, List, Union, Optional, Any
from fastapi import HTTPException
from groq import Groq  # You'll need to install the groq package

class LLMClient:
    """
    Centralized client for LLM interactions using Groq API.
    """
    def __init__(self, default_model: str = "llama3-8b-8192"):
        """
        Initialize the LLM client with Groq API.
        
        Args:
            default_model: Default model to use if not specified in the call
        """
        self.api_key = os.environ.get('GROQ_API_KEY')
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        
        self.client = Groq(api_key=self.api_key)
        self.default_model = default_model
    
    def call_json(self, 
                 prompt: str, 
                 model: Optional[str] = None, 
                 system_prompt: str = "You are a cybersecurity expert specializing in email phishing detection. Always respond with valid JSON only.",
                 temperature: float = 0.3,
                 max_tokens: int = 2000) -> Optional[Dict[str, Union[int, List[str]]]]:
        """
        Call LLM and get response in JSON format.
        
        Args:
            prompt: The user prompt to send
            model: The model to use (falls back to default if None)
            system_prompt: The system prompt to use
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Parsed JSON response or None if error
        """
        try:
            model_name = model or self.default_model
            
            response = self.client.chat.completions.create(
                model=model_name,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            response_content = response.choices[0].message.content
            
            try:
                return json.loads(response_content)
            except json.JSONDecodeError as json_error:
                print(f"Error parsing JSON response: {json_error}")
                print(f"Raw response: {response_content}")
                return None
                
        except Exception as e:
            print(f"Error during LLM call: {e}")
            return None
    
    def call_text(self, 
                 prompt: str, 
                 model: Optional[str] = None,
                 system_prompt: str = "You are a helpful assistant.",
                 temperature: float = 0.7,
                 max_tokens: int = 1000) -> Optional[str]:
        """
        Call LLM and get response as plain text.
        
        Args:
            prompt: The user prompt to send
            model: The model to use (falls back to default if None)
            system_prompt: The system prompt to use
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Text response or None if error
        """
        try:
            model_name = model or self.default_model
            
            response = self.client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return response.choices[0].message.content.strip()
                
        except Exception as e:
            print(f"Error during LLM call: {e}")
            return None

# For backward compatibility, provide the original function interface
def call_model(model: str, prompt: str) -> Optional[Dict[str, Union[int, List[str]]]]:
    """Legacy function that uses the new LLMClient under the hood"""
    client = LLMClient()
    return client.call_json(prompt=prompt, model=model)
