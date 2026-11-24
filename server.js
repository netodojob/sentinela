const app = require("../hospital-system/backend/server");

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Hospital Pro rodando em http://localhost:${port}`);
});
