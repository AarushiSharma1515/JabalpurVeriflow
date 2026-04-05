import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# LangChain Imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import chromadb

load_dotenv()

app = FastAPI()

# Allow Expo app to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Boot the RAG bot once on startup ─────────────────────────────────────────
class VeriflowRAG:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.4
        )
        self.embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        self.chroma_client = chromadb.PersistentClient(path="./veriflow_db")
        self.collection = self.chroma_client.get_or_create_collection(name="farmer_sop")

    def ingest_data(self, pdf_path):
        loader = PyPDFLoader(pdf_path)
        docs = loader.load()
        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        chunks = splitter.split_documents(docs)
        texts = [c.page_content for c in chunks]
        embeddings = self.embedding_model.encode(texts).tolist()
        ids = [f"id_{i}" for i in range(len(texts))]
        self.collection.upsert(ids=ids, embeddings=embeddings, documents=texts)
        print(f"✅ Ingested {len(texts)} SOP chunks.")

    def get_context(self, query):
        query_emb = self.embedding_model.encode([query]).tolist()
        results = self.collection.query(query_embeddings=query_emb, n_results=3)
        return "\n".join(results['documents'][0]) if results['documents'] else ""

    def ask(self, query):
        context = self.get_context(query)
        template = """
        You are the 'Veriflow Assistant,' an expert guide for mangrove farmers and carbon credit stakeholders.

        ROLE & LIMITATIONS:
        - You ONLY answer questions related to Mangroves, Blue Carbon, Carbon Credits, Blockchain, or the Veriflow App.
        - If the question is UNRELATED, reply exactly: "I am specialized in Blue Carbon and Mangrove farming. I cannot provide information on that topic."
        - ALWAYS reply in the SAME LANGUAGE as the user (Hindi, Tamil, English, etc.).

        KNOWLEDGE HIERARCHY:
        1. FIRST use the [CONTEXT] below if the answer is there.
        2. If not in context but clearly about mangroves/carbon, use your general knowledge.

        [CONTEXT]:
        {context}

        USER QUESTION: {question}

        ASSISTANT RESPONSE:"""

        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | self.llm | StrOutputParser()
        return chain.invoke({"context": context, "question": query})


# ── Global bot instance ───────────────────────────────────────────────────────
bot = VeriflowRAG()

# Ingest SOP on first run — comment out after first run
#bot.ingest_data("sop.pdf")  # <-- put your SOP PDF name here and run ONCE

# ── Request/Response models ───────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Veriflow Chatbot API is running ✅"}

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        reply = bot.ask(req.message)
        return {"reply": reply}
    except Exception as e:
        return {"reply": f"Error: {str(e)}"}