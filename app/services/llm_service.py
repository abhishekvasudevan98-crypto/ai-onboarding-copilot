from groq import Groq
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class LLMService:

    def __init__(self):

        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            raise ValueError("GROQ_API_KEY is not set in environment variables.")

        self.client = Groq(api_key=api_key)

    def generate_answer(self, question: str, context: str):

        try:

            system_prompt = f"""
You are Honey's AI onboarding assistant.

Your job is to help employees understand company policies in a friendly, helpful, and conversational way.

Guidelines:
1. Answer naturally like a helpful HR assistant speaking to an employee.
2. Base your answer strictly on the provided policy context.
3. Do NOT invent or guess policies that are not in the context.
4. If the context does not contain the answer, say:
   "I couldn't find this information in the current policy documents."
5. Keep answers concise, clear, and professional.
6. When possible, reference the policy wording in your explanation.

Policy Context:
{context}
"""

            completion = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": question
                    }
                ],
                temperature=0.2,
            )

            return completion.choices[0].message.content

        except Exception as e:

            print(f"LLM Error: {e}")

            return (
                "The system is temporarily experiencing high demand. "
                "Please try again in a few moments."
            )


llm_service = LLMService()