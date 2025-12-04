FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy app files
COPY --chmod=644 index.html /usr/share/nginx/html/
COPY --chmod=644 css/ /usr/share/nginx/html/css/
COPY --chmod=644 js/ /usr/share/nginx/html/js/

# Ensure proper permissions
RUN chmod -R 755 /usr/share/nginx/html && \
    chmod 644 /usr/share/nginx/html/*.html && \
    find /usr/share/nginx/html -type f -name "*.css" -exec chmod 644 {} \; && \
    find /usr/share/nginx/html -type f -name "*.js" -exec chmod 644 {} \;

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
