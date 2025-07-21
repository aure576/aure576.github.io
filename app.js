function useHandleStreamResponse({ onChunk, onFinish }) {
  return async function handleStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let message = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onFinish(message);
        break;
      }
      const chunk = decoder.decode(value);
      message += chunk;
      onChunk(message);
    }
  };
}

function MainComponent() {
  const { useState, useCallback, useEffect } = React;

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("chatMessages");
    return saved ? JSON.parse(saved) : [];
  });
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orderContent, setOrderContent] = useState(() => {
    return localStorage.getItem("orderContent") || "Consulta sobre cemento pulido y servicios de construcción";
  });
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("openaiApiKey") || "");
  const [cleanupTime, setCleanupTime] = useState(() => localStorage.getItem("cleanupTime") || "5");
  const [autoCleanup, setAutoCleanup] = useState(() => localStorage.getItem("autoCleanup") === "true");
  const messagesContainerRef = React.useRef(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  useEffect(() => {
    let cleanup;
    if (autoCleanup) {
      cleanup = setInterval(() => {
        if (messages.length > 0) {
          setMessages([]);
          localStorage.removeItem("chatMessages");
        }
      }, parseInt(cleanupTime) * 60 * 1000);
    }
    return () => cleanup && clearInterval(cleanup);
  }, [cleanupTime, messages.length, autoCleanup]);

  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("orderContent", orderContent);
  }, [orderContent]);

  useEffect(() => {
    localStorage.setItem("openaiApiKey", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("cleanupTime", cleanupTime);
  }, [cleanupTime]);

  useEffect(() => {
    localStorage.setItem("autoCleanup", autoCleanup);
  }, [autoCleanup]);

  const handleCleanMessages = () => {
    setMessages([]);
    localStorage.removeItem("chatMessages");
  };

  const validCredentials = [
    { email: "aure575@gmail.com", password: "KOko1936" },
    { email: "jenny@gmail.com", password: "LAla1936" }
  ];

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const isValid = validCredentials.some(
      (cred) => cred.email === loginEmail && cred.password === loginPassword
    );

    if (isValid) {
      setIsAuthenticated(true);
      setShowLogin(false);
      setLoginError("");
    } else {
      setLoginError("Credenciales incorrectas");
    }
  };

  const loginForm = showLogin ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Acceso Administrativo</h2>
          <button onClick={() => setShowLogin(false)} className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full p-3 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 border border-gray-300 rounded-lg"
              required
            />
          </div>
          {loginError && <div className="text-red-500 text-sm">{loginError}</div>}
          <button type="submit" className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700">
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  ) : null;

  const handleFinish = useCallback((message) => {
    setMessages((prev) => [...prev, { role: "assistant", content: message }]);
    setStreamingMessage("");
  }, []);

  const handleStreamResponse = useHandleStreamResponse({
    onChunk: setStreamingMessage,
    onFinish: handleFinish,
  });

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = { role: "user", content: inputMessage };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: orderContent },
            ...messages,
            userMessage
          ],
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }

      handleStreamResponse(response);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Lo siento, hubo un error. Por favor intenta de nuevo."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {loginForm}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                Cotizador Automático de Decoracion de{" "}
                <span onClick={() => setShowLogin(true)} className="cursor-pointer hover:underline" style={{ color: "inherit" }}>
                  Paredes
                </span>{" "}
                en Cemento Pulido
              </h1>
              <div className="flex gap-2">
                {isAuthenticated && (
                  <button
                    onClick={() => setShowConfig(true)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
                  >
                    <i className="fas fa-cog mr-2"></i>Configuración
                  </button>
                )}
              </div>
            </div>
            <p className="text-gray-600">Sistema profesional de cotización y consulta especializada</p>
          </div>
        </div>

        {isAuthenticated && showConfig ? (
          <>
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-4">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    <i className="fas fa-cog mr-2"></i>
                    Panel de Configuración
                  </h2>
                  <button
                    onClick={() => setShowConfig(false)}
                    className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg border border-gray-300"
                  >
                    Cerrar Panel
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Configuración de API</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">OpenAI API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="sk-..."
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-sm text-gray-700 mb-1">Tiempo de limpieza (minutos)</label>
                        <input
                          type="number"
                          value={cleanupTime}
                          onChange={(e) => setCleanupTime(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          min="1"
                        />
                      </div>
                      <div className="flex items-center mt-6">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoCleanup}
                            onChange={(e) => setAutoCleanup(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Limpieza automática</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">Contexto del Chat</h3>
                    <button
                      onClick={handleCleanMessages}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm"
                    >
                      Limpiar Mensajes
                    </button>
                  </div>
                  <textarea
                    value={orderContent}
                    onChange={(e) => setOrderContent(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows="3"
                    placeholder="Configura el contexto del chat..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900">Total Mensajes</h4>
                    <p className="text-2xl font-bold text-blue-600">{messages.length}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-900">Consultas Hoy</h4>
                    <p className="text-2xl font-bold text-green-600">0</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900">Tiempo Promedio</h4>
                    <p className="text-2xl font-bold text-purple-600">2.5s</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <i className="fas fa-clipboard-list text-blue-500"></i>
                  <span className="text-sm font-semibold text-blue-700">
                    📋 Contexto de Orden 1 incluido en la conversación
                  </span>
                </div>
                <div className="bg-white/60 rounded-lg p-3 border border-blue-200 mt-2">
                  <p className="text-sm text-blue-800">{orderContent}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-4">
            <div className="flex flex-col h-[500px]">
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-4"
                style={{ overflowY: "auto", overflowX: "hidden" }}
              >
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} break-words`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                      style={{ wordBreak: "break-word" }}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {streamingMessage && (
                  <div className="flex justify-start break-words">
                    <div
                      className="max-w-[80%] rounded-lg p-4 bg-gray-100 text-gray-900"
                      style={{ wordBreak: "break-word" }}
                    >
                      {streamingMessage}
                    </div>
                  </div>
                )}

                {isLoading && !streamingMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-4 rounded-lg bg-gray-100">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t p-4 mt-auto">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    className="flex-1 p-3 border border-gray-300 rounded-lg"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex-shrink-0"
                  >
                    {isLoading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-paper-plane"></i>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.render(<MainComponent />, document.getElementById('root'));