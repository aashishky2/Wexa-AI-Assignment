/**
 * SentinelGraph AI Client SDK
 * 1-line Zero-Trust ReBAC Authorization decorator and context filter for LangChain, LlamaIndex, CrewAI, and AutoGen.
 */

class SentinelGraphClient {
  constructor(options = {}) {
    this.endpoint = options.endpoint || process.env.SENTINELGRAPH_ENDPOINT || 'http://localhost:3000';
    this.apiKey = options.apiKey || process.env.SENTINELGRAPH_API_KEY;
  }

  /**
   * Filter documents for LangChain / LlamaIndex retrieval pipelines before LLM context injection.
   * @param {Object} params
   * @param {string} params.userId - Requesting user identifier
   * @param {string} [params.agentPassport] - Ephemeral Agent Passport token if invoked by an autonomous worker
   * @param {Array<{id: string, pageContent: string, metadata?: Object}>} params.documents - Candidate documents retrieved from Vector DB
   * @returns {Promise<{authorizedDocuments: Array, deniedCount: number, tokensSaved: number, proofs: Array}>}
   */
  async filterContext({ userId, agentPassport, documents = [] }) {
    if (!documents.length) {
      return { authorizedDocuments: [], deniedCount: 0, tokensSaved: 0, proofs: [] };
    }

    const authorizedDocuments = [];
    const proofs = [];
    let deniedCount = 0;
    let tokensSaved = 0;

    for (const doc of documents) {
      const assetId = doc.metadata?.assetId || doc.id;
      if (!assetId) {
        // If no explicit assetId, preserve or sanitize
        authorizedDocuments.push(doc);
        continue;
      }

      const res = await this.checkAccess({
        userId,
        assetId,
        agentPassport
      });

      if (res.granted) {
        authorizedDocuments.push(doc);
        proofs.push({ assetId, path: res.path });
      } else {
        deniedCount++;
        // Estimate token count saved (avg 4 chars per token)
        tokensSaved += Math.ceil((doc.pageContent || '').length / 4);
      }
    }

    return {
      authorizedDocuments,
      deniedCount,
      tokensSaved,
      proofs
    };
  }

  /**
   * Direct ReBAC Graph Check
   */
  async checkAccess({ userId, assetId, agentPassport }) {
    try {
      const url = new URL(`${this.endpoint}/api/auth/check-access`);
      url.searchParams.set('contributorId', userId);
      url.searchParams.set('assetId', assetId);
      if (agentPassport) {
        url.searchParams.set('passport', agentPassport);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        return { granted: false, reason: `HTTP error ${res.status}` };
      }
      return await res.json();
    } catch (err) {
      return { granted: false, reason: err.message };
    }
  }
}

/**
 * Python SDK Export Code Template
 */
const PYTHON_SDK_TEMPLATE = `
	# sentinelgraph_ai.py
	import requests
	from typing import List, Dict, Any, Optional

	class SentinelGraphReBACFilter:
    """1-line LangChain & LlamaIndex Pre-Retrieval Context Filter"""
    def __init__(self, endpoint: str = "http://localhost:3000", api_key: Optional[str] = None):
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key

    def filter_documents(self, user_id: str, documents: List[Dict[str, Any]], passport_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Filters vector search documents against live ReBAC graph before LLM prompt assembly.
        """
        authorized = []
        denied = 0
        tokens_saved = 0
        
        for doc in documents:
            asset_id = doc.get("metadata", {}).get("assetId") or doc.get("id")
            if not asset_id:
                authorized.append(doc)
                continue
                
            res = requests.get(
                f"{self.endpoint}/api/auth/check-access",
                params={"contributorId": user_id, "assetId": asset_id, "passport": passport_token}
            )
            
            if res.status_code == 200 and res.json().get("granted", False):
                authorized.append(doc)
            else:
                denied += 1
                tokens_saved += len(doc.get("page_content", "")) // 4
                
        return {
            "authorized_documents": authorized,
            "denied_count": denied,
            "tokens_saved": tokens_saved
        }
`;

module.exports = {
  SentinelGraphClient,
  PYTHON_SDK_TEMPLATE
};
