import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { PDFDocument, PDFName, PDFStream } from 'pdf-lib';

// node PDFSplitter.js <<PATH>> 7 42 91 167 209 245 275 307 351
async function splitPDF() {
    const args = process.argv.slice(2);

    // Validate arguments: requires input file + at least one start page
    if (args.length < 2) {
        console.error('Usage: node PDFSplitter.js <input-file> <startPage1> <startPage2> [<startPage3> ...]');
        console.error('Example: node PDFSplitter.js /path/to/10_Mathematics.pdf 7 42 90');
        process.exit(1);
    }

    const inputFile = args[0];
    
    // Parse all starting pages and sort them numerically
    const startPages = args.slice(1).map(p => parseInt(p, 10)).sort((a, b) => a - b);

    try {
        console.log(`Loading ${inputFile}...`);
        const existingPdfBytes = await fs.readFile(inputFile);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const totalPages = pdfDoc.getPageCount();

        // Automatically build ranges based on the starting page list
        const ranges = [];
        for (let i = 0; i < startPages.length; i++) {
            const start = startPages[i];
            // End is right before the next start page, or the total pages of the PDF for the last section
            const end = (i < startPages.length - 1) ? startPages[i + 1] - 1 : totalPages;
            ranges.push({ start, end });
        }

        const inputDir = path.dirname(path.resolve(inputFile));
        const fileNameWithoutExt = path.basename(inputFile, path.extname(inputFile));
        
        const outputDir = path.join(inputDir, fileNameWithoutExt);
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`Output directory: ${outputDir}`);

        for (let i = 0; i < ranges.length; i++) {
            const { start, end } = ranges[i];
            const pdfIndex = i + 1;
            const pdfFileName = `${pdfIndex}.pdf`;
            const outputPdfPath = path.join(outputDir, pdfFileName);

            if (start < 1 || start > totalPages || start > end) {
                console.error(`Invalid range generated: ${start} to ${end}. (Document has ${totalPages} pages). Skipping ${pdfFileName}.`);
                continue;
            }

            const subDoc = await PDFDocument.create();
            const pageIndices = [];
            for (let p = start; p <= end; p++) {
                pageIndices.push(p - 1);
            }

            const copiedPages = await subDoc.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach((page) => subDoc.addPage(page));

            const pdfBytes = await subDoc.save();
            await fs.writeFile(outputPdfPath, pdfBytes);
            console.log(`Created PDF: ${pdfFileName} (Pages ${start} to ${end})`);

            // Create subfolder for images
            const imageSubDir = path.join(outputDir, `${pdfIndex}`);
            await fs.mkdir(imageSubDir, { recursive: true });

            const subPages = subDoc.getPages();
            let globalImgCount = 1;

            for (let pIdx = 0; pIdx < subPages.length; pIdx++) {
                const page = subPages[pIdx];
                const resourcesRef = page.node.get(PDFName.of('Resources'));
                if (!resourcesRef) continue;

                const resources = subDoc.context.lookup(resourcesRef);
                const xObjectsRef = resources.get(PDFName.of('XObject'));
                if (!xObjectsRef) continue;

                const xObjects = subDoc.context.lookup(xObjectsRef);
                const xObjectKeys = xObjects.keys();

                for (const key of xObjectKeys) {
                    const xObjRef = xObjects.get(key);
                    const xObj = subDoc.context.lookup(xObjRef);

                    if (xObj instanceof PDFStream) {
                        const subtype = xObj.dict.get(PDFName.of('Subtype'));
                        if (subtype === PDFName.of('Image')) {
                            try {
                                let imgBytes = xObj.getContents();
                                const filter = xObj.dict.get(PDFName.of('Filter'));
                                let ext = 'png';

                                if (
                                    filter === PDFName.of('DCTDecode') || 
                                    (Array.isArray(filter) && filter.some(f => f === PDFName.of('DCTDecode')))
                                ) {
                                    ext = 'jpg';
                                } else if (
                                    filter === PDFName.of('FlateDecode') || 
                                    (Array.isArray(filter) && filter.some(f => f === PDFName.of('FlateDecode')))
                                ) {
                                    try {
                                        imgBytes = zlib.inflateSync(imgBytes);
                                    } catch (e) {
                                        // Keep raw if inflation fails
                                    }
                                }

                                const imageName = `img_${globalImgCount}.${ext}`;
                                const imagePath = path.join(imageSubDir, imageName);
                                await fs.writeFile(imagePath, imgBytes);
                                console.log(`   -> Extracted image: ${pdfIndex}/${imageName}`);
                                globalImgCount++;
                            } catch (err) {
                                // Skip individual errors safely
                            }
                        }
                    }
                }
            }
        }

        console.log('PDF splitting and image extraction completed successfully!');
    } catch (err) {
        console.error('Error processing PDF:', err.message);
    }
}

splitPDF();