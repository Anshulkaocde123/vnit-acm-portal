import { useState } from 'react';
import JuliusAPI from './juliusApi';
import './App.css';

function App() {
  const [apiKey] = useState('AQ.Ab8RN6LxFc_hHfikZz-Cvr4B3HuQ2xiPi4JvdhKY0N8n6yUFAQ'); // Load securely in production
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const julius = new JuliusAPI(apiKey);
    try {
      const result = await julius.chatCompletion([
        {
          role: 'user',
          content: query,
          file_paths: file ? [file] : [],
          advanced_reasoning: true
        }
      ]);
      setResponse(result.message.content);
    } catch (error) {
      setResponse(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Julius AI Integration</h1>
        <form onSubmit={handleSubmit}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about your data..."
            className="w-full p-2 border rounded mb-4"
            rows="4"
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="mb-4"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
        {response && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <h2 className="font-semibold">Response:</h2>
            <pre className="whitespace-pre-wrap">{response}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
