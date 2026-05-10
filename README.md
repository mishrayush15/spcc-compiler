# MiniMacro Processor

A two-pass macro processor built for the **System Programming & Compiler Construction** course.

## What It Does

- Write macros using the MiniMacro language
- See the expanded output instantly
- View internal tables (MNT, MDT, ALA) built during processing
- Catch errors like undefined macros, wrong parameters, missing MEND, etc.

## MiniMacro Language

**5 Keywords:** `MACRO`, `MEND`, `LOAD`, `STORE`, `ADD`

```
MACRO ADD_NUMS &A, &B
  LOAD &A
  ADD &B
  STORE RESULT
MEND

ADD_NUMS 5, 10
```

**Output →**
```
LOAD 5
ADD 10
STORE RESULT
```

## How It Works

1. **Pass 1** — Scans code, builds the Macro Name Table (MNT) and Macro Definition Table (MDT)
2. **Pass 2** — Expands macro calls by substituting arguments into the stored definitions

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Built With

React + TypeScript + Vite
