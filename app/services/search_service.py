from app.core.vector_store import vector_store
from app.services.llm_service import llm_service
import re


class SearchService:

    SIMILARITY_THRESHOLD = 0.85

    BLOCKED_PATTERNS = [
        "ignore previous instructions",
        "reveal system prompt",
        "show hidden policies",
        "bypass access control",
        "act as administrator",
        "print all policies"
    ]

    session_memory = {}
    MAX_MEMORY_TURNS = 4

    # ---------------------------
    # Prompt Injection Detection
    # ---------------------------

    def _detect_prompt_injection(self, question: str) -> bool:
        question_lower = question.lower()
        return any(pattern in question_lower for pattern in self.BLOCKED_PATTERNS)

    # ---------------------------
    # Memory Handling
    # ---------------------------

    def _get_last_user_question(self, session_id: str):
        if session_id not in self.session_memory:
            return None
        for turn in reversed(self.session_memory[session_id]):
            if turn["role"] == "user":
                return turn["content"]
        return None

    def _get_memory_context(self, session_id: str):
        if session_id not in self.session_memory:
            return ""
        history = self.session_memory[session_id][-self.MAX_MEMORY_TURNS:]
        return "\n".join(f"{t['role'].capitalize()}: {t['content']}" for t in history)

    def _store_memory(self, session_id: str, question: str, answer: str):
        if session_id not in self.session_memory:
            self.session_memory[session_id] = []

        self.session_memory[session_id].append({"role": "user", "content": question})
        self.session_memory[session_id].append({"role": "assistant", "content": answer})

        if len(self.session_memory[session_id]) > self.MAX_MEMORY_TURNS * 2:
            self.session_memory[session_id] = self.session_memory[session_id][-self.MAX_MEMORY_TURNS * 2:]

    # ---------------------------
    # Overlap-Based Confidence
    # ---------------------------

    def _keyword_overlap_score(self, question: str, context: str):

        clean_q = re.findall(r'\b\w+\b', question.lower())
        clean_c = re.findall(r'\b\w+\b', context.lower())

        if not clean_q:
            return 0

        overlap = sum(1 for word in clean_q if word in clean_c)

        return overlap / len(clean_q)

    def _confidence_label(self, overlap_score: float):

        if overlap_score >= 0.75:
            return "Strong"
        elif overlap_score >= 0.5:
            return "Medium"
        elif overlap_score >= 0.3:
            return "Low"
        else:
            return "Low"

    # ---------------------------
    # Main Search Logic
    # ---------------------------

    def search(self, question: str, user_department: str, session_id: str):

        # Injection Guard
        if self._detect_prompt_injection(question):
            return {
                "answer": "Your request appears to override system policies. Please ask a policy-related question.",
                "confidence": "Rejected"
            }

        # Conversational Retrieval
        last_question = self._get_last_user_question(session_id)
        retrieval_query = (last_question + " " + question) if last_question else question

        results = vector_store.query(retrieval_query, top_k=6)

        if not results["documents"]:
            return {
                "answer": "No relevant policy content found.",
                "confidence": "Rejected"
            }

        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
        distances = results["distances"][0]

        # Access Control Filtering
        allowed_chunks = []

        for doc, meta, dist in zip(documents, metadatas, distances):

            access_scope = meta.get("access_scope")
            doc_department = meta.get("department")

            if access_scope == "General":
                allowed = True
            elif access_scope in ["Department", "Restricted"]:
                allowed = (doc_department == user_department)
            else:
                allowed = False

            if allowed:
                allowed_chunks.append((doc, meta, dist))

        if not allowed_chunks:
            return {
                "answer": "Access Denied: You do not have permission to view this content.",
                "confidence": "Rejected"
            }

        # Group by Document
        doc_groups = {}

        for doc, meta, dist in allowed_chunks:
            doc_name = meta.get("document_name")
            if doc_name not in doc_groups:
                doc_groups[doc_name] = []
            doc_groups[doc_name].append((doc, dist))

        # Choose Best Document
        best_doc_name = min(
            doc_groups.keys(),
            key=lambda name: sum(d for _, d in doc_groups[name]) / len(doc_groups[name])
        )

        best_chunks = sorted(doc_groups[best_doc_name], key=lambda x: x[1])[:4]
        best_distances = [dist for _, dist in best_chunks]

        # Similarity Safety Check
        if min(best_distances) > self.SIMILARITY_THRESHOLD:
            return {
                "answer": "No sufficiently relevant policy content found.",
                "confidence": "Rejected"
            }

        combined_context = "\n\n".join(chunk for chunk, _ in best_chunks)

        memory_context = self._get_memory_context(session_id)
        final_context = memory_context + "\nPolicy Context:\n" + combined_context

        answer = llm_service.generate_answer(question, final_context)

        # Confidence Based on Overlap
        overlap_score = self._keyword_overlap_score(question, combined_context)
        confidence_label = self._confidence_label(overlap_score)

        self._store_memory(session_id, question, answer)

        return {
            "answer": answer,
            "source_policy": best_doc_name,
            "confidence": confidence_label,
            "verification_note": "Please cross-check with the source policy above."
        }


search_service = SearchService()