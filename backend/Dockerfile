# 1. Base Image: Use the official lightweight Node.js v26 Alpine Linux build
FROM node:26-alpine

# 2. Establish working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package metadata files first to exploit Docker layer caching speeds
COPY package*.json ./

# 4. Install project dependencies natively inside the image container
RUN npm install

# 5. Copy the rest of your local codebase folders
COPY . .

# 6. Expose the port your Express app uses
EXPOSE 5001

# 7. Boot the server using your custom package dev script
CMD ["npm", "run", "dev"]
