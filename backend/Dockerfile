FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN useradd --uid 1000 --create-home app
COPY --chown=app:app . .
RUN if [ -d .docker-wheels ]; then pip install --no-index --find-links=.docker-wheels -r requirements.txt; else pip install --timeout 120 --retries 5 --disable-pip-version-check -r requirements.txt; fi
USER app
EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py seed_reference_data && python manage.py runserver 0.0.0.0:8000"]
