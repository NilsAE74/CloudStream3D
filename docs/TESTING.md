Manual test steps

1. Open `renderer/index.html` in a browser (or run the Electron app with `npm start`).
2. Use the file picker to load `samples/sample.xyz`.
3. Confirm you see colored points (red, green, blue, a white/uncolored point, and a yellowish point).
4. If no points appear:
   - Increase `size` in `renderer/app.js` (e.g., to `0.1` or `0.2`).
   - Make sure your `.xyz` doesn't contain comment lines without coordinates.

Automated parser test

Run:

```bash
node test/parse_test.mjs
```

This will print the number of parsed points and a sample of parsed point objects.
