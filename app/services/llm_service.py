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

            completion = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",

                messages=[
                    {
                        "role": "system",
                        "content": """
You are Honey's AI, a corporate onboarding assistant.

You help employees understand company policies.

Instructions:
• Use the provided policy context to answer questions.
• Respond in a clear, friendly, conversational way.
• If the answer exists in the context, explain it simply.
• If the context only partially answers the question, provide the best explanation based on the policy text.
• If the policy does not contain the information, politely say that the information is not available in the current policy documents.

Rules:
• Do NOT invent company policies.
• Do NOT guess information not present in the context.
• Do NOT mention "context" in the final answer.
• Speak naturally like a helpful colleague.
"""
                    },
                    {
                        "role": "user",
                        "content": f"""
Policy Information:

{context}

Employee Question:
{question}
"""
                    }
                ],

                temperature=0.2,
                max_tokens=500
            )

            return completion.choices[0].message.content.strip()

        except Exception as e:

            print(f"LLM Error: {e}")

            return (
                "The system is temporarily experiencing high demand. "
                "Please try again in a few moments."
            )


llm_service = LLMService()