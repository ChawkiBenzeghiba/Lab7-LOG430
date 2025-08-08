require('./sync');
const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors());

app.use(express.json());

const rapportRoutes = require('./routes/rapportRoutes');
app.use('/api', rapportRoutes);

const stockRoutes = require('./routes/stockRoutes');
app.use('/api', stockRoutes);

const magasinRoutes = require('./routes/magasinRoutes');
app.use('/api', magasinRoutes);

const tableauBordRoutes = require('./routes/tableauBordRoutes');
app.use('/api', tableauBordRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API démarrée – écoute sur http://0.0.0.0:${PORT}`);
});