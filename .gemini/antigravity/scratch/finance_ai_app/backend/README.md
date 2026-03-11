# Deploy do Caria IA no Railway

Siga estes passos para colocar o app online:

1.  **Crie um projeto no Railway**: Vá em [railway.app](https://railway.app) e crie um novo projeto.
2.  **Adicione um Banco de Dados**: Clique em "Add Service" -> "Database" -> "PostgreSQL".
3.  **Conecte seu Repositório**: Adicione o serviço para o seu código (GitHub ou CLI).
4.  **Configure as Variáveis de Ambiente**: No serviço do seu app, vá em "Variables" e adicione:
    *   `SECRET_KEY`: Uma string aleatória longa.
    *   `DATABASE_URL`: O Railway geralmente injeta isso automaticamente se o banco estiver no mesmo projeto. Se não, copie a "Connection URL" do seu PostgreSQL.
5.  **Aguarde o Build**: O Railway detectará o `railway.toml` e `requirements.txt` e iniciará o deploy automaticamente.

O app estará disponível na URL gerada pelo Railway (ex: `https://caria-ia.up.railway.app`).
