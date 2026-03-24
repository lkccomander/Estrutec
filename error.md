Run npm run lint

> frontend@0.0.0 lint
> eslint .


/home/runner/work/Estrutec/Estrutec/frontend/src/App.tsx
Warning:   998:6  warning  React Hook useEffect has a missing dependency: 'loadProtectedData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/home/runner/work/Estrutec/Estrutec/frontend/src/modules/projects/ProjectsDashboard.tsx
  192:5  error  Error: Cannot reassign variable after render completes

Reassigning `accumulatedAngle` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.

/home/runner/work/Estrutec/Estrutec/frontend/src/modules/projects/ProjectsDashboard.tsx:192:5
  190 |     const startAngle = accumulatedAngle
  191 |     const endAngle = accumulatedAngle + sweep
> 192 |     accumulatedAngle = endAngle
      |     ^^^^^^^^^^^^^^^^ Cannot reassign `accumulatedAngle` after render completes
  193 |
  194 |     return {
  195 |       ...budget,  react-hooks/immutability

✖ 2 problems (1 error, 1 warning)

Error: Process completed with exit code 1.