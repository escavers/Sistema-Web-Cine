require('dotenv').config();

const express = require('express');
const cors = require('cors');
const ventasRoutes = require('./routes/ventas.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', ventasRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend iniciado en http://localhost:${PORT}`);
  console.log(`📧 Email configurado: ${process.env.EMAIL_USER ? '✅' : '❌'}`);
});
