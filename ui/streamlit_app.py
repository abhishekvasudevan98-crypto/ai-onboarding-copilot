import streamlit as st
import requests
from pathlib import Path

# -----------------------
# CONFIG
# -----------------------
BACKEND_URL = "http://127.0.0.1:8000/ask"
LOGO_PATH = Path("ui/logo.png")

st.set_page_config(layout="wide")

# -----------------------
# SESSION STATE
# -----------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

if "dark_mode" not in st.session_state:
    st.session_state.dark_mode = False

# -----------------------
# THEME
# -----------------------
def theme():
    if st.session_state.dark_mode:
        return {
            "bg": "#121417",
            "card": "#1B1F24",
            "text": "#EAEAEA",
            "muted": "#9CA3AF",
        }
    return {
        "bg": "#F5F6F8",
        "card": "#FFFFFF",
        "text": "#1F2937",
        "muted": "#6B7280",
    }

T = theme()

# -----------------------
# GLOBAL STYLE
# -----------------------
st.markdown(f"""
<style>
.block-container {{
    padding-top: 2rem;
    padding-bottom: 2rem;
    padding-left: 5rem;
    padding-right: 5rem;
}}

header, footer {{
    visibility: hidden;
}}

.stApp {{
    background-color: {T['bg']};
}}

html, body {{
    font-family: 'Inter', sans-serif;
}}

/* Hero Logo */
.hero {{
    display: flex;
    justify-content: center;
    margin-bottom: 40px;
}}

/* Cards */
.card {{
    background-color: {T['card']};
    padding: 22px 26px;
    border-radius: 16px;
    margin-bottom: 20px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.05);
}}

.user-card {{
    border-left: 4px solid #D4AF37;
}}

.ai-card {{
    border-left: 4px solid #B88A2E;
}}

.answer {{
    font-size: 16px;
    color: {T['text']};
    line-height: 1.6;
}}

.meta {{
    margin-top: 12px;
    font-size: 13px;
    color: {T['muted']};
}}

.badge {{
    display: inline-block;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    margin-top: 16px;
}}

.green {{
    background-color: #DCFCE7;
    color: #166534;
}}

.amber {{
    background-color: #FEF9C3;
    color: #854D0E;
}}

.red {{
    background-color: #FEE2E2;
    color: #991B1B;
}}

.toggle-container {{
    position: absolute;
    top: 20px;
    right: 40px;
}}
</style>
""", unsafe_allow_html=True)

# -----------------------
# DARK MODE TOGGLE (Top Right)
# -----------------------
with st.container():
    st.markdown("<div class='toggle-container'>", unsafe_allow_html=True)
    st.session_state.dark_mode = st.toggle("🌙", value=st.session_state.dark_mode)
    st.markdown("</div>", unsafe_allow_html=True)

# -----------------------
# HERO LOGO (CENTERED)
# -----------------------
if LOGO_PATH.exists():
    st.markdown("<div class='hero'>", unsafe_allow_html=True)
    st.image(str(LOGO_PATH), width=240)
    st.markdown("</div>", unsafe_allow_html=True)

# -----------------------
# SIDEBAR
# -----------------------
with st.sidebar:
    st.markdown("### Controls")
    department = st.selectbox(
        "Department",
        ["All", "Finance", "HR", "Consulting", "Compliance", "Security"]
    )

    if st.button("Clear Conversation"):
        st.session_state.messages = []

# -----------------------
# CHAT HISTORY
# -----------------------
for msg in st.session_state.messages:

    if msg["role"] == "user":
        st.markdown(f"""
        <div class="card user-card">
            <div class="answer">{msg['content']}</div>
        </div>
        """, unsafe_allow_html=True)

    else:
        percent = int(msg.get("confidence", 0) * 100)

        if percent >= 80:
            badge = "green"
        elif percent >= 50:
            badge = "amber"
        else:
            badge = "red"

        st.markdown(f"""
        <div class="card ai-card">
            <div class="answer">{msg['content']}</div>

            <div class="meta">
                Source: {msg.get('document_name','N/A')} |
                Department: {msg.get('department','N/A')}
            </div>

            <div>
                <span class="badge {badge}">
                    Confidence: {percent}%
                </span>
            </div>
        </div>
        """, unsafe_allow_html=True)

# -----------------------
# INPUT
# -----------------------
question = st.chat_input("Ask a policy question...")

if question:

    st.session_state.messages.append({
        "role": "user",
        "content": question
    })

    try:
        payload = {
            "question": question,
            "department": None if department == "All" else department
        }

        response = requests.post(BACKEND_URL, json=payload)

        if response.status_code == 200:
            data = response.json()
            answer = data.get("answer") or data.get("reason", "No relevant content found.")

            st.session_state.messages.append({
                "role": "assistant",
                "content": answer,
                "confidence": data.get("confidence", 0),
                "document_name": data.get("document_name", "N/A"),
                "department": data.get("department", "N/A")
            })
        else:
            st.session_state.messages.append({
                "role": "assistant",
                "content": "Backend error. Please check server.",
                "confidence": 0
            })

    except Exception:
        st.session_state.messages.append({
            "role": "assistant",
            "content": "Unable to connect to backend.",
            "confidence": 0
        })

    st.rerun()