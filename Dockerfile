FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy app files
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

# Ensure proper permissions
RUN chmod -R 755 /usr/share/nginx/html && \
    chmod 644 /usr/share/nginx/html/*.html && \
    find /usr/share/nginx/html -type f -name "*.css" -exec chmod 644 {} \; && \
    find /usr/share/nginx/html -type f -name "*.js" -exec chmod 644 {} \;

# Expose port
EXPOSE 80

# Health check using curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
