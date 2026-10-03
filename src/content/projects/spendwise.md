---
title: SpendWise
slug: spendwise
year: 2026
period: Jan–Apr 2026
role: Product Manager & Full-Stack Engineer
tech: [Django, PostgreSQL, Python, Web scraping]
summary: A searchable home for UofT's scholarships, built with a 7-person team for CSC301.
cover: /projects/spendwise/cover.png
coverAlt: SpendWise cover (placeholder)
order: 1
files:
  - { type: txt, name: README.txt }
  - { type: image, name: cover.png, src: /projects/spendwise/cover.png, alt: 'SpendWise cover (placeholder)' }
  - { type: video, name: demo.mp4, src: '' } # pending: set src to /projects/spendwise/demo.mp4
  - { type: image, name: architecture.png, src: /projects/spendwise/architecture.png, alt: 'SpendWise architecture diagram (placeholder)' }
  - { type: link, name: GitHub, url: 'https://github.com/university-of-toronto-spendwise/spendwise' }
---

## what it is

SpendWise pulls UofT's scholarships into one place you can actually search and filter, so students can find the funding they qualify for without digging through the Award Explorer page by page.

## my role

Product Manager & Full-Stack Engineer on a 7-person team, Jan–Apr 2026 (UofT CSC301).

## stack

Django, PostgreSQL, Python web scraping.

## what I built

I led sprint planning and the roadmap for a cross-functional team of seven, using 1-on-1 check-ins to unblock work across the UI, backend and data streams.

On the backend, I designed and implemented a normalized PostgreSQL scholarship data model in Django, with UUID primary keys, indexed filtering fields and upsert logic, which brought duplicate ingestion errors down to zero across re-runs.

I also built the end-to-end scraping pipeline for UofT's Award Explorer. It ingests 4,300+ scholarships by parsing each detail page and normalizing amounts, deadlines and eligibility into structured records.

## the hard part

DRAFT: write this yourself.

## what I'd do next

DRAFT: write this yourself.
