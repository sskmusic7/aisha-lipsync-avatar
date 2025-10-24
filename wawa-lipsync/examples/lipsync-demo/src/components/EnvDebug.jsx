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
        
        <div className="mt-2 p-2 bg-blue-100 rounded">
          <p className="font-bold text-sm">API Key Status:</p>
          <p className="text-sm">
            {import.meta.env.VITE_GOOGLE_API_KEY ? 
              'Using VITE_GOOGLE_API_KEY ✅' : 
              import.meta.env.VITE_GEMINI_API_KEY ? 
                'Using VITE_GEMINI_API_KEY as fallback ⚠️' : 
                'No API key available ❌'
            }
          </p>
          
          {/* Manual OAuth Test Button */}
          <div className="mt-3">
            <button 
              onClick={async () => {
                try {
                  console.log('🧪 Manual OAuth test starting...');
                  alert('🧪 Starting OAuth test... Check console for details!');
                  
                  const { googleCalendarService } = await import('../services/googleCalendarService.js');
                  
                  console.log('🔄 Initializing service...');
                  const initialized = await googleCalendarService.initialize();
                  console.log('Initialization result:', initialized);
                  
                  if (initialized) {
                    console.log('🔑 Testing sign-in...');
                    alert('🔑 Attempting OAuth sign-in... Popup should appear!');
                    await googleCalendarService.signIn();
                    console.log('✅ Sign-in successful!');
                    alert('✅ OAuth sign-in successful!');
                  } else {
                    console.error('❌ Initialization failed');
                    alert('❌ Initialization failed - check console for details');
                  }
                } catch (error) {
                  console.error('❌ Manual OAuth test failed:', error);
                  alert(`❌ OAuth test failed: ${error.message}`);
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
            >
              🧪 Test OAuth Manually
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
