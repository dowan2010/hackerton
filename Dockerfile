# =============================================================
# 🧭 RootHome GIS Weather Map - Serverless Cloud Run Deploy
# =============================================================

# 1. Use the ultra-lightweight Nginx alpine base for high-performance static hosting
FROM nginx:alpine

# 2. Set working directory to Nginx html folder
WORKDIR /usr/share/nginx/html

# 3. Clean default files
RUN rm -rf ./*

# 4. Copy current directory assets (HTML, CSS, JS, municipal database JSON) into Nginx container
COPY . /usr/share/nginx/html/

# 5. Overwrite custom lightweight Nginx config to support Cloud Run's dynamic PORT injection
RUN echo 'server { \
    listen 8080; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ =404; \
    } \
}' > /etc/nginx/conf.d/default.conf

# 6. Cloud Run listens on port 8080 by default (standard serverless port)
EXPOSE 8080

# 7. Start Nginx server in foreground
CMD ["nginx", "-g", "daemon off;"]
