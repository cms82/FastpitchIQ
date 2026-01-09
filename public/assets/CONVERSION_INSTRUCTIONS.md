# Converting softballfield.eps to SVG

The EPS file needs to be converted to SVG format for use in web browsers.

## Option 1: Using Inkscape (Free)
1. Download and install Inkscape: https://inkscape.org/
2. Open `softballfield.eps` in Inkscape
3. File → Save As → Choose "Plain SVG (*.svg)"
4. Save as `softballfield.svg` in this directory

## Option 2: Using Adobe Illustrator
1. Open `softballfield.eps` in Adobe Illustrator
2. File → Export → Export As
3. Choose "SVG (svg)" format
4. Save as `softballfield.svg` in this directory

## Option 3: Online Converter
1. Use an online EPS to SVG converter (e.g., https://convertio.co/eps-svg/)
2. Upload `softballfield.eps`
3. Download the converted SVG
4. Save as `softballfield.svg` in this directory

## After Conversion
Once `softballfield.svg` is created, update `src/components/Field.tsx` to use it by:
1. Embedding the SVG content directly in the `<g id="field-base">` element, OR
2. Using an `<image>` or `<use>` element to reference `/assets/softballfield.svg`

The current viewBox is `0 0 300 280`, so you may need to scale/transform the converted SVG to match these dimensions.
