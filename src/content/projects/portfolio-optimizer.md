---
title: Portfolio Optimizer
slug: portfolio-optimizer
year: 2025
period: Dec 2025
role: Personal project
tech: [Python, FastAPI, cvxpy, pandas, React, REST API]
summary: A full-stack tool that finds the best risk-adjusted mix of stocks and backtests it against the S&P 500.
cover: /projects/portfolio-optimizer/cover.png
coverAlt: Portfolio Optimizer cover (placeholder)
order: 3
files:
  - { type: txt, name: README.txt }
  - { type: image, name: cover.png, src: /projects/portfolio-optimizer/cover.png, alt: 'Portfolio Optimizer cover (placeholder)' }
  - { type: image, name: efficient-frontier.png, src: /projects/portfolio-optimizer/efficient-frontier.png, alt: 'Efficient frontier chart (placeholder)' }
  - { type: link, name: GitHub, url: 'https://github.com/usha-sj/portfolio-optimizer' }
  - { type: link, name: Live Demo, url: '' } # TODO: add the demo URL
---

## what it is

A portfolio optimizer: pick a universe of stocks and it finds the mix with the best risk-adjusted return under a volatility limit, then shows how that portfolio would have done against the S&P 500.

## my role

Personal project, Dec 2025. DRAFT: confirm this was solo.

## stack

Python (FastAPI, cvxpy, pandas), React, REST API.

## what I built

The FastAPI backend screens a user-defined stock universe and solves a mean-variance convex optimization with cvxpy to maximize risk-adjusted returns under volatility constraints.

The React frontend talks to it live, visualizing the optimal asset weights, the efficient frontier, the sector allocation breakdown, and a backtest of the portfolio against the S&P 500 over a date range you choose.

## the hard part

DRAFT: write this yourself.

## what I'd do next

DRAFT: write this yourself.
