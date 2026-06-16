FROM python:3.11-alpine

RUN apk add --no-cache git curl bash

RUN pip3 install --no-cache-dir semgrep flask

WORKDIR /app

COPY runner.py .

RUN mkdir -p /mnt/semgrep/results && chmod 777 /mnt/semgrep/results

EXPOSE 5100

CMD ["python3", "runner.py"]
