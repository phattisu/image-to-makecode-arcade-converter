let currentMode = "solid"; // "solid" or "dotMatrix"
let currentDotMatrixType = "pattern"; // "pattern" or "solidApprox"
let dotBlockSize = 2; // Default dot matrix block size
let originalImageSize = { width: 0, height: 0 };
let gifData = null; // Store parsed GIF data
let gifMinDelay = 0; // Store minimum GIF frame delay
let imgrender = [];
let sizeTotal = {width: 0, height: 0}; // Total size for MakeCode sprite
let imgSizeTotal = {width: 0, height: 0}; // Total size for image display

// --- Get DOM Elements ---
const image = document.querySelector("img");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d"); // Use ctx for context
const copyButton = document.querySelector("button#copy");
const runButton = document.querySelector("button#run");
const customSizes = document.querySelectorAll("input[type='number'].custom");
const fileInput = document.querySelector("input#myFile");
const form = document.querySelector("form"); // Size form
const radioButtons = document.querySelectorAll("input[name='sizeOption']"); // Size radio buttons
const colorPicks = document.querySelectorAll("input.colorpicker[type='color']"); // Palette colors
const colorTexts = document.querySelectorAll("input.colortext[type='text']"); // Palette text colors
const scaleFactor = document.querySelector("input[type='number']#factor");
const textarea = document.querySelector("textarea");
const statusDiv = document.querySelector("#status");

// New elements for mode selection and dot matrix
const modeRadios = document.querySelectorAll("input[name='processingMode']");
const dotMatrixOptionsDiv = document.querySelector(".dot-matrix-options");
const dotFgColorInput = document.querySelector("#dotFgColor.colorpicker");
const dotBgColorInput = document.querySelector("#dotBgColor.colorpicker");
const dotFgColorText = document.querySelector("#dotFgColor.colortext");
const dotBgColorText = document.querySelector("#dotBgColor.colortext");
const dotMatrixTypeRadios = document.querySelectorAll("input[name='dotMatrixType']");
const dotBlockSizeInput = document.querySelector("#dotBlockSize");

// --- Helper Functions ---
function isValidHex(hex) {
    return /^#([0-9A-Fa-f]{6})$/.test(hex);
}

function hexToRgb(hex) {
    const r = parseInt(hex[1] + hex[2], 16);
    const g = parseInt(hex[3] + hex[4], 16);
    const b = parseInt(hex[5] + hex[6], 16);
    return { r: r, g: g, b: b};
}

function rgbToHex(r, g, b) {
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function colorSqrt(color) {
    return Math.sqrt(color.r * color.r + color.g * color.g + color.b * color.b); // คำนวณระยะห่างจากสีดำ (0, 0, 0)
}

function colorInvert(color) {
    // ฟังก์ชันสำหรับกลับสี (invert) โดยการเปลี่ยนค่า RGB เป็น 255 - ค่าเดิม
    return {
        r: 255 - color.r,
        g: 255 - color.g,
        b: 255 - color.b,
        a: (color.a)?color.a:255 // คงค่า alpha เดิมไว้
    };
}

function colorDivide(color, divisor) {
    // ฟังก์ชันสำหรับแบ่งสี (divide) โดยการหารค่า RGB ด้วยตัวหารที่กำหนด
    return {
        r: Math.round(color.r / divisor),
        g: Math.round(color.g / divisor),
        b: Math.round(color.b / divisor),
        a: (color.a)?color.a:255 // คงค่า alpha เดิมไว้
    };
}

function rgbToValue(color) {
    // ฟังก์ชันสำหรับแปลงสี RGB เป็นค่าเดียว (เช่น 0xRRGGBB)
    return (color.r << 16) | (color.g << 8) | color.b;
}

function valueToRgb(value) {
    // ฟังก์ชันสำหรับแปลงค่าเดียว (เช่น 0xRRGGBB) กลับเป็นสี RGB
    const r = (value >> 16) & 0xFF;
    const g = (value >> 8) & 0xFF;
    const b = value & 0xFF;
    return { r: r, g: g, b: b, a: 255}; // คงค่า alpha เป็น 255
}

// ฟังก์ชันคำนวณระยะห่างสูงสุดที่เป็นไปได้ระหว่างสีสองสี (จาก #000000 ถึง #FFFFFF)
function getMaxPossibleDistance() {
    // ระยะห่างระหว่างดำสนิทกับขาวสนิท
    // RGB for #000000 is (0, 0, 0)
    // RGB for #FFFFFF is (255, 255, 255)
    const dr = 0 - 255;
    const dg = 0 - 255;
    const db = 0 - 255;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

// ฟังก์ชันหลักสำหรับเปรียบเทียบคู่สีที่ป้อนกับพาเลทสี
async function compareColorsWithPalette(inputSqrt, palette) {
    const inputDistance = inputSqrt;

    const maxDistance = getMaxPossibleDistance();
    let minDistanceDifference = Infinity;
    let closestPair = {col1: null, col2: null};

    // วนลูปผ่านทุกคู่สีที่เป็นไปได้ในพาเลท
    for (let i = 1; i < palette.length; i++) {
        for (let j = 1; j < palette.length; j++) { // เริ่มจาก j = i + 1 เพื่อหลีกเลี่ยงคู่สีซ้ำและเปรียบเทียบสีเดียวกัน
            if (i === j) continue; // ข้ามคู่สีเดียวกัน
            const paletteColor1 = palette[i].color;
            const paletteColor2 = palette[j].color;

            const currentPaletteDistance = colorDistance(paletteColor1, paletteColor2);

            if (currentPaletteDistance === null) {
                // ข้ามคู่สีในพาเลทที่ไม่ถูกต้อง
                continue;
            }


            // คำนวณความแตกต่างของระยะห่างระหว่างคู่สีที่ป้อนกับคู่สีในพาเลท
            const distanceDifference = Math.abs(inputDistance - currentPaletteDistance);

            // หากความแตกต่างน้อยกว่าค่าต่ำสุดที่เคยเจอ ให้เก็บคู่นี้ไว้
            if (distanceDifference < minDistanceDifference) {
                minDistanceDifference = distanceDifference;
                closestPair = {col1: paletteColor1, col2: paletteColor2};
            }
        }
    }

    // คำนวณเปอร์เซ็นต์ความเหมือน
    // ความเหมือน 100% คือเมื่อ distanceDifference เป็น 0
    // ความเหมือน 0% คือเมื่อ distanceDifference เท่ากับ maxDistance (ค่าสูงสุดของระยะห่าง)
    const similarityPercentage = ((maxDistance  - minDistanceDifference) / maxDistance) * 1;

    return ({percent: similarityPercentage, color1: closestPair.col1, color2: closestPair.col2}); // ส่งคืนคู่สีที่ใกล้เคียงที่สุด
}

function getPixelColor(imageData, x, y) {
    const index = (y * imageData.width + x) * 4;
    return {
        r: imageData.data[index],
        g: imageData.data[index + 1],
        b: imageData.data[index + 2],
        a: imageData.data[index + 3]
    };
}

function setPixelColor(imageData, x, y, r, g, b, a = 255) {
    const index = (y * imageData.width + x) * 4;
    imageData.data[index] = r;
    imageData.data[index + 1] = g;
    imageData.data[index + 2] = b;
    imageData.data[index + 3] = a;
}


function colorDistance(color1, color2) {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

// --- UI Syncing ---
function syncColorToText(colorInput) {
    const textInput = document.querySelector(`input.colortext[id='${colorInput.id}']`);
    if (textInput) {
        textInput.value = colorInput.value;
    }
}

function syncTextToColor(textInput) {
    const colorInput = document.querySelector(`input.colorpicker[id='${textInput.id}']`);
    if (colorInput) {
        if (isValidHex(textInput.value)) {
            colorInput.value = textInput.value;
        } else {
            textInput.value = colorInput.value;
        }
    }
}

colorPicks.forEach(colorInput => {
    colorInput.addEventListener("input", function() { // Use 'input' for live update
        syncColorToText(colorInput);
    });
});

colorTexts.forEach(textInput => {
    textInput.addEventListener("change", function() {
        syncTextToColor(textInput);
    });
});

function dragstartHandler(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function dragoverHandler(ev) {
    ev.preventDefault();
}

function dropHandler(ev) {
    ev.preventDefault();
    whenImageIsUploaded(); // Ensure image is loaded before processing
}

// --- Event Listeners ---
runButton.addEventListener("click", running); // Removed duplicate listener
fileInput.addEventListener("change", whenImageIsUploaded);

radioButtons.forEach(radioButton => {
    radioButton.addEventListener("change", function sizeOption() {
        document.querySelector("input#width").removeAttribute("disabled")
        document.querySelector("input#height").removeAttribute("disabled")
        runButton.removeAttribute("disabled")
        document.querySelector("input#ratio").removeAttribute("disabled")
        let sizeMode = this.id;
        if (sizeMode === "custom") {
            if (document.querySelector("img")) {
                document.querySelector("input#width").value = document.querySelector("img").width
                document.querySelector("input#height").value = document.querySelector("img").height
            } else {
                document.querySelector("input#width").value = canvas.width
                document.querySelector("input#height").value = canvas.height
            }
        } else {
            document.querySelector("input#ratio").setAttribute("disabled", "true")
        }
        customSizes.forEach(field => field.disabled = (sizeMode !== "custom"));
        scaleFactor.disabled = (sizeMode !== "scale");
        if (sizeMode === "scale" && scaleFactor.value === "") scaleFactor.value = 0.1; // Set default if empty
        const img = document.querySelector("img");
        if (img) {
            // No need to convert immediately, wait for run button
            // convert(img); // Or just update dimensions? Let's update dimensions first
            updateImageDimensions(img, sizeMode);
        }
    });
});

modeRadios.forEach(radio => {
    radio.addEventListener("change", function() {
        currentMode = this.value;
        // If an image is loaded, update preview/parameters area
        const img = document.querySelector("img");
        if (img) {
             // No conversion here, just UI update. Conversion on run button.
        }
    });
});

dotMatrixTypeRadios.forEach(radio => {
    radio.addEventListener("change", function() {
        currentDotMatrixType = this.value;
        const img = document.querySelector("img");
        if (img) {
            // No conversion here, just UI update. Conversion on run button.
        }
    });
});

const palInput = document.getElementById('myPal')

palInput.addEventListener('change', function(e) {
    const file = palInput.files[0]
    if (!file) {
        const arcadeColors = [
            "#ffffff","#ff2121","#ff93c4",
            "#ff8135","#fff609","#249ca3",
            "#78dc52","#003fad","#87f2ff",
            "#8e2ec4","#a4839f","#5c406c",
            "#e5cdc4","#91463d","#000000",
        ]
        document.querySelectorAll("input.colorpicker").forEach((input, index) => {
            input.value = arcadeColors[index]
            syncColorToText(input)
        })
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const palText = reader.result;
        // Assuming the palette text is in the format #RRGGBB per line
        readPalText(palText);
    };
    reader.readAsText(file); // Read as text for palette files
});

function readPalText(palText) {
    const lines = palText.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (i < 15) { // Assuming 16 colors max
            let color = line.toString();
            if (color.charAt(0) !== "#") color = "#" + color; // Add # if missing
            
            const colorInput = document.querySelector(`input.colorpicker[id='col${i + 1}']`);
            if (colorInput && isValidHex(color)) {
                colorInput.value = color;
                syncColorToText(colorInput); // Sync text input as well
            }
        } else {
            return; // Stop after 16 colors
        }
    };
}


// Prevent form submission from refreshing
form.addEventListener("submit", function convertImage(event) {
    event.preventDefault(); // Prevent form submission

});

// --- Image Loading and GIF Parsing ---
async function whenImageIsUploaded() {
    runButton.setAttribute("disabled", "true");
    copyButton.setAttribute("disabled", "true");
    statusDiv.textContent = "Loading file...";
    gifData = null; // Reset GIF data

    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function(e) {
        const img = document.createElement("img");
        const node = document.querySelector("img");
        if (node !== null) {
            node.parentNode.removeChild(node);
        }
        document.querySelector("div.output").appendChild(img);
        img.onload = () => {
            originalImageSize.width = img.width;
            originalImageSize.height = img.height;

            // Set initial size mode (e.g., full-width) and update dimensions
            const initialSizeMode = document.querySelector("input[name='sizeOption']:checked").id;
            updateImageDimensions(img, initialSizeMode);

            statusDiv.textContent = `Image loaded: ${originalImageSize.width}x${originalImageSize.height}`;
            runButton.removeAttribute("disabled");
            // Initial preview might be done here if needed, or wait for run.
            // Let's do an initial conversion with default settings for preview
            running(); // Auto-run on load

        };

        if (file.type === "image/gif") {
            statusDiv.textContent = "Loading GIF...";
            try {
                const arrayBuffer = await file.arrayBuffer();
                const gif = new GIFuct(arrayBuffer);
                gifData = gif.parseGIF()
                    .then(parsedData => {
                        console.log("Parsed GIF data:", parsedData);
                        return parsedData;
                    })
                    .catch(error => {
                        comsole.error("Error parsing GIF:", error);
                    });

                if (gifData.frames.length > 0) {
                    gifMinDelay = gifData.frames.reduce((min, frame) => Math.min(min, frame.delay || Infinity), Infinity);
                    if (gifMinDelay === Infinity) gifMinDelay = 0; // Handle case with no delay info

                    statusDiv.textContent = `GIF loaded: ${originalImageSize.width}x${originalImageSize.height}, ${gifData.frames.length} frames, min delay: ${gifMinDelay}ms`;

                     // Use the first frame for initial display dimensions
                    const firstFrame = await processFrameDataToImageData(gifData.frames[0], gifData.lsd);
                    canvas.width = firstFrame.width;
                    canvas.height = firstFrame.height;
                    ctx.putImageData(firstFrame, 0, 0);

                    img.src = canvas.toDataURL(); // Display first frame on the img element

                    runButton.removeAttribute("disabled");

                } else {
                    statusDiv.textContent = "Error: GIF has no frames.";
                    runButton.setAttribute("disabled", "true");
                }
            } catch (error) {
                console.error("Error parsing GIF:", error);
                statusDiv.textContent = "Error parsing GIF. Invalid file?";
                runButton.setAttribute("disabled", "true");
                gifData = null; // Clear invalid data
            }

        } else {
            // For non-GIFs, just set the src
            img.src = e.target.result;
        }
    };

    reader.readAsDataURL(file); // Read as Data URL for static images
}

// Function to process raw frame data from gifuct-js into ImageData
async function processFrameDataToImageData(frameData, lsd) {
    // This requires creating a temporary canvas to draw the frame on
    // gifuct-js provides frame.getImageData(), but it might need the full GIF context
    // A simpler way is to let gifuct-js draw to a canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = lsd.width;
    tempCanvas.height = lsd.height;
    const tempCtx = tempCanvas.getContext('2d');

    // gifuct-js internal rendering often needs the full gif object,
    // or we manually draw based on frame.patch and previous frame data
    // Let's use the buildPatch method which simplifies this
    const patch = await new GIFuct([frameData], lsd).buildPatch(); // Needs full lsd

    // We need to draw patch onto the canvas based on the frame's properties
    // This part can be complex depending on disposal method.
    // A basic approach is to draw the patch at frame.dims.left, frame.dims.top
    const frameImageData = new ImageData(lsd.width, lsd.height);

    // Need a way to composite frames correctly respecting disposal methods
    // This might be better handled by gifuct-js itself or requires more complex logic
    // For simplicity, let's try to get ImageData for the frame's patch and draw it
    // A more robust way: use gif.renderFrame(index, canvas_context) if available or manually composite

    // As a basic starting point, let's assume we can get the pixel data for the frame area
    // This is a simplified representation and might not handle all GIF disposal methods correctly.
    // A full implementation would need to draw previous frames and clear areas based on disposal.

    // Alternative: Get the frame's pixel data directly if possible (gifuct-js might support this)
    // Or use a helper function that composites frames.

    // Let's use a simplified approach: Just get the pixel data for the frame's patch
    // This ignores previous frames and disposal methods, suitable for simple GIFs.
    const framePatchImageData = new ImageData(new Uint8ClampedArray(patch), frameData.dims.width, frameData.dims.height);

    // Now draw this patch onto the temporary canvas at the correct position
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height); // Clear for each frame's patch
    tempCtx.putImageData(framePatchImageData, frameData.dims.left, frameData.dims.top);

    // Return the ImageData of the whole frame area
    return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
}

function rgb(r,g,b) {
    return ((r * 65536) + (g * 256) + b)
}

// --- Image Processing Function ---
async function convert(imgElement, frameImageData = null, frameIndex = 0) {
    copyButton.innerText = "Copy code"; // Reset text

    imgrender = []
    let sourceImageData;
    let originalWidth, originalHeight;

    if (frameImageData) {
        sourceImageData = frameImageData;
        originalWidth = sourceImageData.width;
        originalHeight = sourceImageData.height;
    } else {
        // For static images, draw to temp canvas to get ImageData
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgElement.naturalWidth;
        tempCanvas.height = imgElement.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(imgElement, 0, 0, tempCanvas.width, tempCanvas.height);
        sourceImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        originalWidth = imgElement.naturalWidth;
        originalHeight = imgElement.naturalHeight;
    }


    let targetWidth = imgElement.width; // Use the adjusted display size
    let targetHeight = imgElement.height;

    let outputCanvasWidth = targetWidth;
    let outputCanvasHeight = targetHeight;
    let makeCodeScaleFactor = 1; // How much MakeCode dimensions are scaled

    // get resulting size based on canvas size
    sizeTotal.width = targetWidth;
    sizeTotal.height = targetHeight;
    
    // get resulting size based on image size
    imgSizeTotal.width = imgElement.naturalWidth;
    imgSizeTotal.height = imgElement.naturalHeight;

    // Set canvas size for the output preview
    canvas.width = outputCanvasWidth;
    canvas.height = outputCanvasHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    // Get the palette or dot matrix colors
    const arcadeColors = [
        "#00000000", // Transparent - Index 0
        document.getElementById('col1').value,
        document.getElementById('col2').value,
        document.getElementById('col3').value,
        document.getElementById('col4').value,
        document.getElementById('col5').value,
        document.getElementById('col6').value,
        document.getElementById('col7').value,
        document.getElementById('col8').value,
        document.getElementById('col9').value,
        document.getElementById('col10').value,
        document.getElementById('col11').value,
        document.getElementById('col12').value,
        document.getElementById('col13').value,
        document.getElementById('col14').value,
        document.getElementById('col15').value,
    ].map(function convertFromHexToRGB(color, index) {
        const rgb = hexToRgb(color);
        return {
            color: rgb,
            index: (index).toString(16)
        };
    });

    let pixelIndex = 0;
    const outputImageData = ctx.createImageData(outputCanvasWidth, outputCanvasHeight);
    // Calculate mapping from target dimensions (based on size options) back to original image dimensions
    const xScale = originalWidth / targetWidth;
    const yScale = originalHeight / targetHeight;
    if (currentMode === "dotMatrix") {
        // Dot matrix mode requires a buffer for dithering
        window.ditherBuffer = [];
        for (let by = 0; by < outputCanvasHeight; by++) {
            window.ditherBuffer[by] = [];
            for (let bx = 0; bx < outputCanvasWidth; bx++) {
                // copy original pixel
                const orig = getPixelColor(sourceImageData, 
                    Math.max(0, Math.min(Math.floor(bx * xScale), sourceImageData.width - 1)),
                    Math.max(0, Math.min(Math.floor(by * yScale), sourceImageData.height - 1))
                );
                window.ditherBuffer[by][bx] = { ...orig };
            }
        }
    }


    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {

            // Get the color from the original image corresponding to this (x, y) in the *scaled* view
            // Average nearby pixels in the original if scaling down, or just pick nearest
            // Simple approach: pick the pixel from the original image corresponding to the top-left corner of the scaled pixel
            const originalX = Math.floor(x * xScale);
            const originalY = Math.floor(y * yScale);

             // Ensure coordinates are within bounds of sourceImageData
            const clampedOriginalX = Math.max(0, Math.min(originalX, sourceImageData.width - 1));
            const clampedOriginalY = Math.max(0, Math.min(originalY, sourceImageData.height - 1));


            const originalPixelColor = getPixelColor(sourceImageData, clampedOriginalX, clampedOriginalY);

            // Handle transparency from the source image
            if (originalPixelColor.a === 0) {
                if (currentMode === "solid") {
                    // For solid mode, transparent original pixel maps to transparent palette color (index 0)
                    // Draw transparent on the preview canvas
                    // No need to set pixel data in outputImageData for transparent areas unless required by MakeCode format
                    // For MakeCode string, this will be '0'
                    
                } else if (currentMode === "dotMatrix") {
                    // Decide how transparent original pixels behave in dot matrix
                    // Option 1: Make the entire block transparent (simplest)
                    // Option 2: Use the background dot color (less common)
                    // Let's make the block transparent
                }

                if (currentMode === "solid") {
                    // Draw transparent pixel in the preview canvas
                    // ctx.clearRect(x, y, 1, 1); // Or set alpha in outputImageData
                    // The MakeCode string character for transparent is usually '0'
                } else if (currentMode === "dotMatrix") {
                     // Draw transparent block in the preview canvas
                     // ctx.clearRect(x * dotBlockSize, y * dotBlockSize, dotBlockSize, dotBlockSize);
                     // For MakeCode string, a block of '0's
                }


            } else {
                // --- Process based on Mode ---
                if (currentMode === "solid") {
                    // --- Solid Color Mode (Existing Logic) ---
                    const nearest = arcadeColors.sort((prev, curr) => {
                        const distPrev = colorDistance(originalPixelColor, prev.color);
                        const distCurr = colorDistance(originalPixelColor, curr.color);
                        return distPrev - distCurr;
                    })[0];

                    // Draw preview pixel
                    ctx.fillStyle = `rgb(${nearest.color.r}, ${nearest.color.g}, ${nearest.color.b})`;
                    ctx.fillRect(x, y, 1, 1);

                    // Set pixel data in outputImageData for MakeCode string generation
                    const outputRgb = nearest.color;
                    setPixelColor(outputImageData, x, y, outputRgb.r, outputRgb.g, outputRgb.b, 255);


                } else if (currentMode === "dotMatrix") {
                    // Floyd–Steinberg dithering (16-color palette)
                    // เตรียม buffer สำหรับ dithering

                    // ใช้ค่าจาก buffer แทน originalPixelColor
                    const bufColor = window.ditherBuffer[y][x];
                    // หา nearest palette color
                    const nearest = arcadeColors
                        .map(c => ({
                            ...c,
                            dist: colorDistance(bufColor, c.color)
                        }))
                        .sort((a, b) => a.dist - b.dist)[0];

                    // วาด pixel preview
                    ctx.fillStyle = `rgb(${nearest.color.r}, ${nearest.color.g}, ${nearest.color.b})`;
                    ctx.fillRect(x, y, 1, 1);

                    // Set pixel data ใน outputImageData
                    setPixelColor(outputImageData, x, y, nearest.color.r, nearest.color.g, nearest.color.b, 255);

                    // คำนวณ error
                    const err = {
                        r: bufColor.r - nearest.color.r,
                        g: bufColor.g - nearest.color.g,
                        b: bufColor.b - nearest.color.b
                    };

                    // กระจาย error ไปยัง pixel ข้างเคียงใน buffer (Floyd–Steinberg)
                    function distributeError(dx, dy, factor) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < outputCanvasWidth && ny >= 0 && ny < outputCanvasHeight) {
                            const nbuf = window.ditherBuffer[ny][nx];
                            nbuf.r = Math.max(0, Math.min(255, nbuf.r + err.r * factor));
                            nbuf.g = Math.max(0, Math.min(255, nbuf.g + err.g * factor));
                            nbuf.b = Math.max(0, Math.min(255, nbuf.b + err.b * factor));
                        }
                    }
                    distributeError(1, 0, 7 / 16);
                    distributeError(-1, 1, 3 / 16);
                    distributeError(0, 1, 5 / 16);
                    distributeError(1, 1, 1 / 16);

                }
            }
            if (currentMode === "solid") {
                pixelIndex++; // Increment for solid mode (1:1 pixel mapping)
            } else if (currentMode === "dotMatrix" && currentDotMatrixType === "solidApprox") {
                pixelIndex++; // Increment for solid approximation (1:1 pixel mapping on output canvas)
            } else if (currentMode === "dotMatrix" && currentDotMatrixType === "pattern") {
                // Pixel index logic is different for patterns as we fill blocks
                // We can just iterate through the outputImageData array later for MakeCode string
            }
        }
    }

    // --- Generate MakeCode String ---
    let makeCodeString = "";
    const paletteLookup = arcadeColors.reduce((map, color) => {
        // Use the *exact* RGB value drawn on the canvas for lookup
        const hex = rgbToHex(color.color.r, color.color.g, color.color.b);
        map[hex] = color.index;
        return map;
    }, {});
    // Add transparent color mapping explicitly
    paletteLookup[rgbToHex(0,0,0)] = '0'; // Assuming 000000 is transparent if alpha is 0 (or use the explicit transparent color input)
    const transparentColor = hexToRgb("#00000000"); // Get explicit transparent color if used in palette
    paletteLookup[rgbToHex(transparentColor.r, transparentColor.g, transparentColor.b)] = '0';


    // Loop through the generated outputImageData (which is on the canvas)
    for (let y = 0; y < outputCanvasHeight; y++) {
        let rowString = "";
        for (let x = 0; x < outputCanvasWidth; x++) {
            const pixelColor = getPixelColor(outputImageData, x, y);
            const pixelHex = rgbToHex(pixelColor.r, pixelColor.g, pixelColor.b);

            let colorIndex = '0'; // Default to transparent

            if (pixelColor.a > 0) { // Only look up if not transparent
                // In solid mode, find the closest of the 16 colors again (or map the exact color drawn)
                // Mapping the exact color drawn is more reliable if it came from the palette/interpolation
                if (paletteLookup[pixelHex] !== undefined) {
                    colorIndex = paletteLookup[pixelHex];
                } else {
                    // If the exact color isn't in the paletteLookup (e.g., interpolated solidApprox), find the closest
                    // This shouldn't happen for solid mode which picks from the palette
                    // For solidApprox, we draw interpolated colors. We need to map these back to the 16 palette colors OR generate a string that handles more colors?
                    // MakeCode sprite format is usually 16 colors. We need to map the interpolated color back to the closest of the *16 arcadeColors*.

                    // This case should ideally be covered by paletteLookup
                    const nearest = arcadeColors.sort((prev, curr) => {
                        const distPrev = colorDistance(pixelColor, prev.color);
                        const distCurr = colorDistance(pixelColor, curr.color);
                        return distPrev - distCurr;
                    })[0];
                    colorIndex = nearest.index;
                }
            }
            colorIndex = (colorIndex.toLowerCase() === "0") ? "f" : colorIndex.toLowerCase();
            rowString += colorIndex;
        }
        makeCodeString += rowString + "\n";
    }

    let spriteCode = `img\`\n${makeCodeString}\``;

     // For GIF, return the frame data/string, don't set the textarea directly
    if (gifData) {
        // Return frame string and delay
        return { spriteCode: spriteCode, delay: gifData.frames[frameIndex].delay || gifMinDelay };
    } else {
        let dateString = new Date()
		.toISOString()
		.replaceAll("-", "")
		.replaceAll(":", "")
		.replaceAll(".", "")
        // For static image, set textarea and enable copy
        textarea.textContent = `let mySprite${dateString} = sprites.create(${spriteCode}, SpriteKind.Player);\n`;
        copyButton.removeAttribute("disabled");
        return { spriteCode: spriteCode }; // Return for consistency
    }
}

// Function to run the conversion process
async function running() {
    runButton.setAttribute("disabled", "true");
    copyButton.setAttribute("disabled", "true");
    textarea.textContent = ""; // Clear previous output
    statusDiv.textContent = "Converting...";

    const img = document.querySelector("img");
    if (!img || (!gifData && (!img.complete || img.naturalWidth === 0))) {
        statusDiv.textContent = "No image loaded.";
        return;
    }

     // Ensure image dimensions are set according to size options before processing
    const currentSizeMode = document.querySelector("input[name='sizeOption']:checked").id;
    updateImageDimensions(img, currentSizeMode); // Update img element dimensions


    if (gifData && gifData.frames.length > 0) {
        // Process GIF frames
        statusDiv.textContent = `Converting GIF with ${gifData.frames.length} frames...`;
        const frameResults = [];
        let processingErrors = false;

        for (let i = 0; i < gifData.frames.length; i++) {
            try {
                statusDiv.textContent = `Converting frame ${i + 1}/${gifData.frames.length}...`;
                 // Need to get ImageData for the current frame, properly composited
                 // This requires a more advanced GIF rendering approach than just getting the patch.
                 // Let's simplify: just process the patch data for now, acknowledging limitations with complex GIFs.
                 // A robust solution needs frame compositing logic (draw previous frame, apply disposal, draw current patch).

                 // Simplified approach: Draw the GIF frame to a temporary canvas using gifuct-js's renderer
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = gifData.lsd.width;
                tempCanvas.height = gifData.lsd.height;
                const tempCtx = tempCanvas.getContext('2d');

                 // This requires a method from gifuct-js to render a specific frame
                 // Assuming such a method exists or we implement the logic:
                 // For demonstration, let's try to get ImageData from the buildPatch result again
                 // Note: This will likely only work correctly for GIFs with Disposal Method 1 (None)
                const framePatch = await new GIFuct([gifData.frames[i]], gifData.lsd).buildPatch();
                const framePatchImageData = new ImageData(new Uint8ClampedArray(framePatch), gifData.frames[i].dims.width, gifData.frames[i].dims.height);

                 // Create a canvas the size of the full GIF frame
                const fullFrameCanvas = document.createElement('canvas');
                fullFrameCanvas.width = gifData.lsd.width;
                fullFrameCanvas.height = gifData.lsd.height;
                const fullFrameCtx = fullFrameCanvas.getContext('2d');

                 // Draw the patch onto the full frame canvas at the correct position
                fullFrameCtx.putImageData(framePatchImageData, gifData.frames[i].dims.left, gifData.frames[i].dims.top);

                 // Get the full frame ImageData
                const fullFrameImageData = fullFrameCtx.getImageData(0, 0, fullFrameCanvas.width, fullFrameCanvas.height);

                 // Now, process this full frame ImageData
                const result = await convert(img, fullFrameImageData, i); // Pass ImageData and index
                frameResults.push(result);
            } catch (error) {
                console.error(`Error processing GIF frame ${i}:`, error);
                statusDiv.textContent = `Error processing GIF frame ${i + 1}. See console.`;
                processingErrors = true;
                break; // Stop processing on error
            }
        }

        if (!processingErrors) {
             // Combine frame results into a single output string
            let gifOutput = `let gifFrames = [\n`;
            frameResults.forEach((frame, index) => {
                gifOutput += `  ${frame.spriteCode},\n`;
            });
            gifOutput += `];\n\n`;
            gifOutput += `let frameDelays = [\n`;
             // Use original delays, or modify based on minDelay if needed
            frameResults.forEach((frame, index) => {
                 gifOutput += `  ${frame.delay},\n`; // Use delay from parsing
            });
            gifOutput += `];\n\n`;

            // Add example code to play the animation (basic loop)
            gifOutput += `let currentFrame = 0;\n`;
            gifOutput += `let animationSprite = sprites.create(gifFrames[0], SpriteKind.Player);\n`;
            gifOutput += `game.onEveryInterval(frameDelays[currentFrame], function () {\n`;
            gifOutput += `  currentFrame = (currentFrame + 1) % gifFrames.length;\n`;
            gifOutput += `  animationSprite.setImage(gifFrames[currentFrame]);\n`;
            gifOutput += `});\n`;


            textarea.textContent = gifOutput;
            statusDiv.textContent = `Conversion complete: ${gifData.frames.length} frames processed.`;
            copyButton.removeAttribute("disabled");
        }


    } else {
        // Process static image
        try {
            const result = convert(img); // Process the single image
            // Textarea and copy button are handled inside convert for static images
            statusDiv.textContent = `Conversion complete. imagesizetotal(${imgSizeTotal.width}x${imgSizeTotal.height}) canvassizetotal(${sizeTotal.width}x${sizeTotal.height})`;
            if ((imgSizeTotal.width.isNaN || imgSizeTotal.height.isNaN) || (sizeTotal.width.isNaN || sizeTotal.height.isNaN)) {
                statusDiv.textContent = "Invalid to converting from image size"
            };
        } catch (error) {
            console.error("Error converting image:", error);
            statusDiv.textContent = "Error converting image. See console.";
            runButton.setAttribute("disabled", "true");
            copyButton.setAttribute("disabled", "true");
        }
    }

    runButton.removeAttribute("disabled");
}

// Function to update the dimensions of the displayed img element based on radio button selection
function updateImageDimensions(img, sizeMode) {
    let imageWidth = originalImageSize.width;
    let imageHeight = originalImageSize.height;

    if (sizeMode === "custom") {
        let customWidth = parseInt(document.querySelector(".custom#width").value, 10);
        let customHeight = parseInt(document.querySelector(".custom#height").value, 10);

        if (!isNaN(customWidth) && !isNaN(customHeight)) {
            imageWidth = customWidth;
            imageHeight = customHeight;
        } else if (!isNaN(customWidth)) {
            const factor = customWidth / originalImageSize.width;
            imageWidth = customWidth;
            imageHeight = Math.round(originalImageSize.height * factor);
        } else if (!isNaN(customHeight)) {
            const factor = customHeight / originalImageSize.height;
            imageWidth = Math.round(originalImageSize.width * factor);
            imageHeight = customHeight;
        } else {
            // Default to original size if custom inputs are invalid/empty
            imageWidth = originalImageSize.width;
            imageHeight = originalImageSize.height;
        }
    } else if (sizeMode === "scale") {
        const factor = parseFloat(document.querySelector("input#factor").value);
        if (!isNaN(factor)) {
            imageWidth = Math.round(originalImageSize.width * factor);
            imageHeight = Math.round(originalImageSize.height * factor);
        } else {
             // Default to original size if factor is invalid
            imageWidth = originalImageSize.width;
            imageHeight = originalImageSize.height;
        }
    } else if (sizeMode === "full-width") {
        const factor = 160 / originalImageSize.width;
        imageWidth = 160;
        imageHeight = Math.round(originalImageSize.height * factor);
    } else if (sizeMode === "full-height") {
        const factor = 120 / originalImageSize.height;
        imageWidth = Math.round(originalImageSize.width * factor);
        imageHeight = 120;
    } else {
        // Default or original size
        imageWidth = originalImageSize.width;
        imageHeight = originalImageSize.height;
    }

     // Ensure dimensions are positive integers
    img.width = Math.max(1, Math.round(imageWidth));
    img.height = Math.max(1, Math.round(imageHeight));

    // Also update canvas display size for preview consistency before drawing
    canvas.style.width = img.width + 'px';
    canvas.style.height = img.height + 'px';

     // The actual drawing resolution will be set within the convert function
}

document.querySelectorAll("input#width").forEach(iwidth => {
    iwidth.addEventListener("change", function () {
        if (document.querySelector("input#ratio").checked) {
            if (document.querySelector("img")) {
                const factor = document.querySelector("input#width").value / document.querySelector("img").width;
                document.querySelector("input#height").value = Math.round(document.querySelector("img").height * factor);
            } else {
                const factor = document.querySelector("input#width").value / canvas.width;
                document.querySelector("input#height").value = Math.round(canvas.height * factor);
            }
        }
    })
})

document.querySelectorAll("input#height").forEach(iheight => {
    iheight.addEventListener("change", function () {
        if (document.querySelector("input#ratio").checked) {
            if (document.querySelector("img")) {
                const factor = document.querySelector("input#height").value / document.querySelector("img").height;
                document.querySelector("input#width").value = Math.round(document.querySelector("img").width * factor);
            } else {
                const factor = document.querySelector("input#height").value / canvas.height;
                document.querySelector("input#width").value = Math.round(canvas.width * factor);
            }
        }
    })
})

document.querySelector("input#ratio").addEventListener("change", function () {
    if (document.querySelector("input#ratio").checked) {
        if (document.querySelector("img")) {
            document.querySelector("input#height").value = document.querySelector("img").height;
            document.querySelector("input#width").value = document.querySelector("img").width;
        } else {
            document.querySelector("input#height").value = canvas.height;
            document.querySelector("input#width").value = canvas.width;
        }
    }
})


// --- Initial State ---
runButton.setAttribute("disabled", "true"); // Disable run on load
copyButton.setAttribute("disabled", "true"); // Disable copy on load

document.querySelector("input#width").value = canvas.width
document.querySelector("input#height").value = canvas.height

// Restore original image size (this function is not needed anymore with updated logic)
// function resetImageSize(img) {
//     img.width = originalImageSize.width;
//     img.height = originalImageSize.height;
// }

// Add copy functionality
copyButton.addEventListener("click", function addCodeToClipboard() {
    textarea.select();
    document.execCommand("copy");
    console.log("Code copied!");
    copyButton.innerText = "Code copied to clipboard!";
    // resetImageSize(document.querySelector("img")); // Not needed
});

console.log(document.querySelector("input#ratio").disabled)