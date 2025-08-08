FROM node:18

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Expose the port Vite runs on
EXPOSE 5173

# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 