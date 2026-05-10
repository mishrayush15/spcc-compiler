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

## How to Set This Up Locally (Super Easy!)

If you want to run this app on your own computer, just follow these simple steps:

1. **Install Node.js:** Make sure you have [Node.js](https://nodejs.org/) installed on your computer.
2. **Open your terminal:** Open Command Prompt, PowerShell, or your code editor's terminal in this folder.
3. **Install dependencies:** Type this command and hit Enter:
   ```bash
   npm install
   ```
4. **Start the app:** Type this command and hit Enter:
   ```bash
   npm run dev
   ```
5. **Open your browser:** Click the local link that appears in your terminal (usually `http://localhost:5173` or `http://localhost:5174`).

## Built With

React + TypeScript + Vite
