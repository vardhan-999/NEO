export const mockFraudData = {
  suspicious_companies: [
    { company: "Acme Corp", risk: 85 },
    { company: "Global Tech", risk: 72 },
    { company: "Nexus Ltd", risk: 65 },
    { company: "Vertex Inc", risk: 54 },
    { company: "Zenith Co", risk: 48 },
    { company: "Pinnacle LLC", risk: 45 },
    { company: "Apex Systems", risk: 30 }
  ],
  alerts: [
    { alert_id: "ALT-001", risk_level: "High", fraud_type: "Circular Trading", details: "Detected circular flow of funds between Acme Corp, Nexus Ltd, and Vertex Inc without actual movement of goods." },
    { alert_id: "ALT-002", risk_level: "High", fraud_type: "Fake Invoices", details: "Global Tech issued invoices to multiple non-existent entities to claim input tax credit." },
    { alert_id: "ALT-003", risk_level: "Medium", fraud_type: "Sudden Spike in Turnover", details: "Pinnacle LLC showed a 500% spike in turnover in the last quarter compared to the previous year." }
  ]
};

export const mockGraphData = {
  nodes: [
    { id: "Acme Corp", group: "Company", risk: 85 },
    { id: "Global Tech", group: "Company", risk: 72 },
    { id: "Nexus Ltd", group: "Company", risk: 65 },
    { id: "Vertex Inc", group: "Company", risk: 54 },
    { id: "Zenith Co", group: "Company", risk: 20 },
    { id: "Pinnacle LLC", group: "Company", risk: 30 },
    { id: "John Doe", group: "Director" },
    { id: "Jane Smith", group: "Director" }
  ],
  links: [
    { source: "John Doe", target: "Acme Corp", label: "owns", value: 10 },
    { source: "John Doe", target: "Nexus Ltd", label: "owns", value: 10 },
    { source: "Jane Smith", target: "Global Tech", label: "owns", value: 10 },
    { source: "Acme Corp", target: "Nexus Ltd", label: "trades_with", value: 50 },
    { source: "Nexus Ltd", target: "Vertex Inc", label: "trades_with", value: 40 },
    { source: "Vertex Inc", target: "Acme Corp", label: "trades_with", value: 45 },
    { source: "Global Tech", target: "Acme Corp", label: "trades_with", value: 20 },
    { source: "Zenith Co", target: "Vertex Inc", label: "trades_with", value: 30 },
    { source: "Pinnacle LLC", target: "Zenith Co", label: "trades_with", value: 25 }
  ]
};
