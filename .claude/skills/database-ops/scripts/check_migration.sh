#!/bin/bash
# Verify migration is consistent with current models
echo "Checking migration consistency..."
alembic check
if [ $? -eq 0 ]; then
    echo "Migration is up to date"
else
    echo "Migration mismatch — run: alembic revision --autogenerate -m 'description'"
    exit 1
fi
