# Regex to Finite Automata Visualizer

An interactive web application that converts a regular expression into an equivalent finite automaton and visualizes the construction process step by step. The project is designed for Theory of Automata and Formal Languages coursework, with emphasis on the relationship between regular expressions, ε-NFAs, and DFAs.

## Project Overview

This application takes a user defined regular expression, parses it, and builds an equivalent ε-NFA using Thompson's construction. It can also convert the ε-NFA into a DFA using subset construction. The generated automata are displayed visually, and the user can simulate test strings to check whether they are accepted or rejected.

In addition to the final automaton view, the project includes a construction walkthrough that shows how the ε-NFA and DFA are built step by step. These steps can be explored manually or played automatically as an animation.

## Objectives

- Convert a regular expression into an equivalent ε-NFA
- Convert the ε-NFA into a DFA
- Visualize automata clearly using graph-based rendering
- Demonstrate Thompson's construction and subset construction interactively
- Simulate input strings on the generated automata
- Provide an intuitive user interface for learning and presentation

## Features

- Regular expression parsing with support for:
  - union `|`
  - implicit concatenation
  - Kleene star `*`
  - one-or-more `+`
  - optional `?`
  - parentheses `()`
- ε-NFA generation using Thompson's construction
- DFA generation using subset construction
- Graph visualization of states and transitions
- Start and accept state highlighting
- Construction steps panel with:
  - clickable steps
  - step preview graph
  - auto-play animation
  - stop control
  - playback speed control
- Input string simulation with acceptance/rejection output
- Responsive UI suitable for desktop and mobile

## Theory Used

### Thompson's Construction

Thompson's construction is used to convert a regular expression into an equivalent ε-NFA. Each basic symbol creates a simple fragment, and operators such as union, concatenation, and Kleene star combine smaller fragments into larger automata until a complete ε-NFA is formed.

### Subset Construction

Subset construction is used to convert the ε-NFA into a DFA. Each DFA state represents a set of ε-NFA states. The epsilon-closure and move operations are used repeatedly to create deterministic transitions.

## Tech Stack

- HTML5
- CSS3
- JavaScript
- SVG for graph rendering

## Project Structure

```text
.
├── index.html   # Main UI structure
├── style.css    # Styling and responsive layout
├── script.js    # Regex parsing, automata construction, visualization, simulation
└── README.md    # Project documentation
```

## How to Use

1. Enter a regular expression in the input field.
2. Click `Build ε-NFA` to generate the ε-NFA.
3. Click `Build DFA` to generate the DFA.
4. View the automaton graph in the visualization section.
5. Use the `Construction Steps` panel to inspect the step-by-step build process.
6. Click `Play Steps` to animate the construction.
7. Use `Stop` to pause the animation and change playback speed if needed.
8. Enter test strings and click `Simulate Strings` to check acceptance.

## Sample Regex Inputs

- `(a|b)*abb`
- `a(b|c)*`
- `(0|1)*01`
- `ab?c+`
- `(a|b)(a|b)*`

## Educational Value

This project helps students understand:

- how regular expressions are parsed
- how formal constructions build equivalent automata
- the role of epsilon transitions in NFAs
- how deterministic automata are derived from nondeterministic ones
- how string acceptance works in finite automata

## Future Improvements

- Transition table view for each step
- Previous and next controls for manual walkthrough
- Export graph as image or SVG
- Highlight traversal path during string simulation
- Support for more advanced regex syntax
