FROM oven/bun

COPY . .

CMD ["bun", "index.js"]
