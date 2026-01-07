FROM python:3.10-alpine

WORKDIR /app

# Install database clients
RUN apk add --no-cache mariadb-client postgresql-client mongodb-tools

COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

COPY ./src ./src

CMD ["python3", "-m", "flask", "run", "--host=0.0.0.0"]