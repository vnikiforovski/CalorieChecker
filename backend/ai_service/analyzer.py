import json
import re

import anthropic
from django.conf import settings

SYSTEM_PROMPT = (
    "You are a nutrition expert. Analyze the meal and return ONLY a JSON object "
    "with this structure: "
    "{\"items\": [{\"name\": string, \"quantity\": number, \"unit\": string, "
    "\"calories\": number, \"protein\": number, \"carbs\": number, \"fat\": number, "
    "\"ai_confidence\": number}], "
    "\"healthy_alternatives\": [string], "
    "\"total_calories\": number, \"total_protein\": number, "
    "\"total_carbs\": number, \"total_fat\": number, "
    "\"uncertainty_note\": string}"
)


def _extract_json(text: str) -> str:
    # Strip markdown code fences if present
    match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if match:
        return match.group(1).strip()
    # Fall back to first {...} block
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        return match.group(0)
    return text


def analyze_meal(
    text: str | None = None,
    image_data: str | None = None,
    image_media_type: str | None = None,
) -> dict:
    """
    Call Claude to analyze a meal description or image.
    Returns a parsed nutrition dict or {'error': reason} on failure.
    """
    if not text and not image_data:
        return {'error': 'No input provided.'}

    content: list[dict] = []

    if image_data and image_media_type:
        content.append({
            'type': 'image',
            'source': {
                'type': 'base64',
                'media_type': image_media_type,
                'data': image_data,
            },
        })

    content.append({
        'type': 'text',
        'text': text if text else 'Analyze this meal image and provide nutritional information.',
    })

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{'role': 'user', 'content': content}],
        )
        raw = message.content[0].text.strip()
        return json.loads(_extract_json(raw))
    except json.JSONDecodeError as exc:
        return {'error': f'Failed to parse AI response as JSON: {exc}'}
    except anthropic.AuthenticationError:
        return {'error': 'Invalid Anthropic API key.'}
    except anthropic.RateLimitError:
        return {'error': 'Anthropic API rate limit reached. Please try again later.'}
    except anthropic.APIStatusError as exc:
        return {'error': f'Anthropic API error {exc.status_code}: {exc.message}'}
    except anthropic.APIConnectionError:
        return {'error': 'Could not connect to Anthropic API.'}
    except Exception as exc:
        return {'error': f'Unexpected error: {exc}'}
