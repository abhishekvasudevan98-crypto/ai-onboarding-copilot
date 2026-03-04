from groq import Groq
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()


class LLMService:

    def __init__(self):

        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            raise ValueError("GROQ_API_KEY is not set in environment variables.")

        self.client = Groq(api_key=api_key)

    def generate_answer(self, question: str, context: str):

        try:
            completion = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a corporate policy assistant. Answer strictly based on the provided policy context. Be clear, concise, and conversational. Do not hallucinate."
                    },
                    {
                        "role": "user",
                        "content": f"Context:\n{context}\n\nQuestion:\n{question}"
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