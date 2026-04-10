"""
Model Runner Service
Sends prompts to OpenAI-compatible model endpoints and collects responses.
Supports: OpenAI, vLLM, Ollama, LMStudio, Together AI, HuggingFace Inference API.
"""

import httpx
from typing import Optional


async def run_prompt(
    endpoint: str,
    model_name: str,
    prompt: str,
    api_key: Optional[str] = None,
    timeout: float = 60.0,
) -> str:
    """
    Send a prompt to an OpenAI-compatible chat completions endpoint.

    Args:
        endpoint: Base URL (e.g. http://localhost:11434/v1)
        model_name: Model identifier (e.g. llama3, gpt-4o-mini)
        prompt: The user prompt to send
        api_key: Optional API key for authenticated endpoints
        timeout: Request timeout in seconds

    Returns:
        The model's response text
    """
    url = f"{endpoint.rstrip('/')}/chat/completions"

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant. Answer the question directly and concisely.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.0,
        "max_tokens": 1024,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except httpx.HTTPStatusError as e:
        return f"[ERROR] HTTP {e.response.status_code}: {e.response.text[:200]}"
    except httpx.ConnectError:
        return f"[ERROR] Could not connect to {endpoint}"
    except Exception as e:
        return f"[ERROR] {type(e).__name__}: {str(e)[:200]}"


async def run_prompt_huggingface(
    model_id: str,
    prompt: str,
    api_key: str,
    timeout: float = 60.0,
) -> str:
    """
    Send a prompt to HuggingFace Inference API.

    Args:
        model_id: HuggingFace model ID (e.g. meta-llama/Llama-3-8b-chat-hf)
        prompt: The user prompt
        api_key: HuggingFace API token
        timeout: Request timeout in seconds

    Returns:
        The model's response text
    """
    url = f"https://api-inference.huggingface.co/models/{model_id}"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 1024, "temperature": 0.01},
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                return data[0].get("generated_text", "").strip()
            return str(data)
    except httpx.HTTPStatusError as e:
        return f"[ERROR] HTTP {e.response.status_code}: {e.response.text[:200]}"
    except httpx.ConnectError:
        return f"[ERROR] Could not connect to HuggingFace API"
    except Exception as e:
        return f"[ERROR] {type(e).__name__}: {str(e)[:200]}"
