// Callback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const exchangeCode = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      
      try {
        const response = await fetch('/api/proxy/auth/code-exchange', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ClientId: 'your_client_id',
                ClientSecret: 'your_client_secret',
                TempCode: code
            })
        });
        
        if (response.ok) {
          const token = await response.text();
          // Удаляем кавычки из токена если они есть
          const cleanToken = token.replace(/^"|"$/g, '');
          
          // Создаем cookie с токеном
          document.cookie = `jwt=${cleanToken}; path=/; secure; samesite=Lax`;
          
          navigate('/');
        } else {
          console.error('Auth error');
          navigate('/');
        }
      } catch (err) {
        console.error('Exchange error:', err);
        navigate('/');
      }
    };

    exchangeCode();
  }, [navigate]);

  return <div>Авторизация...</div>;
}

export default Callback;