// Environment Variables Debug Component
// This helps debug what environment variables are available

export const EnvDebug = () => {
  const envVars = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'));
  
  return (
    <div className="bg-gray-100 p-4 rounded-lg text-sm">
      <h3 className="font-bold mb-2">🔍 Environment Variables Debug</h3>
      <p className="mb-2">Total VITE_ variables: {envVars.length}</p>
      <div className="space-y-1">
        {envVars.map(key => (
          <div key={key} className="flex justify-between">
            <span className="font-mono">{key}:</span>
            <span className="font-mono text-gray-600">
              {import.meta.env[key] ? 
                `${import.meta.env[key].substring(0, 20)}...` : 
                'undefined'
              }
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-2 bg-yellow-100 rounded">
        <p className="font-bold">Required for Calendar:</p>
        <p>VITE_GOOGLE_CLIENT_ID: {import.meta.env.VITE_GOOGLE_CLIENT_ID ? '✅' : '❌'}</p>
        <p>VITE_GOOGLE_API_KEY: {import.meta.env.VITE_GOOGLE_API_KEY ? '✅' : '❌'}</p>
        <p>VITE_GEMINI_API_KEY: {import.meta.env.VITE_GEMINI_API_KEY ? '✅' : '❌'}</p>
      </div>
    </div>
  );
};
