#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Simple token counting function that approximates GPT tokenization
// This is not as accurate as tiktoken but works well for most text
function countTokens(text) {
  if (!text) return 0;

  // Simple tokenization logic that approximates GPT tokenization
  // Split on whitespace and handle punctuation
  const words = text.split(/\s+/).filter(Boolean);
  let tokenCount = 0;

  for (const word of words) {
    // Count punctuation as separate tokens
    const punctuationCount = (
      word.match(/[.,!?;:(){}\[\]<>\/\\|@#$%^&*_=+-]/g) || []
    ).length;

    // For English text, estimate words + punctuation
    // This gives a rough approximation that works for most Western languages
    const wordTokens = Math.ceil(word.length / 4);
    tokenCount += wordTokens + punctuationCount;
  }

  // Add extra tokens for newlines
  const newlines = (text.match(/\n/g) || []).length;
  tokenCount += newlines;

  return tokenCount;
}

// Function to create a new filename with index
function createOutputFilename(inputFilePath, index) {
  const parsedPath = path.parse(inputFilePath);
  return path.join(
    parsedPath.dir,
    `${parsedPath.name}-part${index}${parsedPath.ext}`
  );
}

// Get just the filename without the path
function getBasename(filePath) {
  return path.basename(filePath);
}

// Check if a line is a markdown heading
function isHeading(line) {
  return /^#{1,6}\s+/.test(line);
}

// Check if line is a good break point (empty line, heading, or horizontal rule)
function isGoodBreakPoint(line) {
  return (
    line.trim() === "" ||
    isHeading(line) ||
    line.trim() === "---" ||
    line.trim() === "***" ||
    line.trim() === "___"
  );
}

// Create navigation links for the file
function createNavigationLinks(currentIndex, totalFiles, baseFilename) {
  let nav = `## Document Part ${currentIndex} of ${totalFiles}\n\n`;

  if (currentIndex > 1) {
    const prevFile = getBasename(
      baseFilename.replace(`part${currentIndex}`, `part${currentIndex - 1}`)
    );
    nav += `[⬅️ Previous Part](${prevFile}) | `;
  } else {
    nav += `[⬅️ Previous Part] | `;
  }

  // Add links to all parts
  nav += "Parts: ";
  for (let i = 1; i <= totalFiles; i++) {
    if (i === currentIndex) {
      nav += `[${i}] `;
    } else {
      const partFile = getBasename(
        baseFilename.replace(`part${currentIndex}`, `part${i}`)
      );
      nav += `[${i}](${partFile}) `;
    }
  }

  if (currentIndex < totalFiles) {
    const nextFile = getBasename(
      baseFilename.replace(`part${currentIndex}`, `part${currentIndex + 1}`)
    );
    nav += ` | [Next Part ➡️](${nextFile})`;
  } else {
    nav += ` | [Next Part ➡️]`;
  }

  nav += "\n\n---\n\n";
  return nav;
}

// Create navigation footer
function createNavigationFooter(currentIndex, totalFiles, baseFilename) {
  let footer = "\n\n---\n\n";

  if (currentIndex > 1) {
    const prevFile = getBasename(
      baseFilename.replace(`part${currentIndex}`, `part${currentIndex - 1}`)
    );
    footer += `[⬅️ Previous Part (${currentIndex - 1})](${prevFile}) | `;
  } else {
    footer += `[⬅️ Previous Part] | `;
  }

  if (currentIndex < totalFiles) {
    const nextFile = getBasename(
      baseFilename.replace(`part${currentIndex}`, `part${currentIndex + 1}`)
    );
    footer += `[Next Part (${currentIndex + 1}) ➡️](${nextFile})`;
  } else {
    footer += `[Next Part ➡️]`;
  }

  return footer;
}

// Add navigation to all split files after they've been created
function addNavigationToFiles(basePath, fileCount) {
  for (let i = 1; i <= fileCount; i++) {
    const filePath = createOutputFilename(basePath, i);

    // Read the file content
    let content = fs.readFileSync(filePath, "utf8");

    // Add navigation header
    const navHeader = createNavigationLinks(
      i,
      fileCount,
      getBasename(filePath)
    );

    // Add navigation footer
    const navFooter = createNavigationFooter(
      i,
      fileCount,
      getBasename(filePath)
    );

    // Combine and write back to file
    const updatedContent = navHeader + content + navFooter;
    fs.writeFileSync(filePath, updatedContent);

    console.log(`Added navigation to file: ${filePath}`);
  }
}

// Main function to process and split markdown file
async function splitMarkdownFile(inputFilePath, maxTokens = 32000) {
  try {
    console.log(`Processing ${inputFilePath}...`);

    // Check if file exists
    if (!fs.existsSync(inputFilePath)) {
      throw new Error(`File does not exist: ${inputFilePath}`);
    }

    // Create a readable stream
    const fileStream = fs.createReadStream(inputFilePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let currentFileContent = "";
    let currentTokenCount = 0;
    let fileIndex = 1;
    let totalTokenCount = 0;
    let lineCount = 0;

    // Buffer to hold potential split points
    let pendingLines = [];
    let pendingTokens = 0;
    let lastGoodBreakPointIndex = -1;

    // Process file line by line
    for await (const line of rl) {
      lineCount++;
      const lineTokens = countTokens(line);
      totalTokenCount += lineTokens;

      // Keep track of good break points in our pending lines
      pendingLines.push(line);
      pendingTokens += lineTokens;

      if (isGoodBreakPoint(line)) {
        lastGoodBreakPointIndex = pendingLines.length - 1;
      }

      // Check if we need to split the file
      if (currentTokenCount + pendingTokens > maxTokens) {
        // If we've found a good break point, use it
        if (lastGoodBreakPointIndex !== -1) {
          // Add lines up to the break point to the current file
          const linesToAdd = pendingLines.slice(0, lastGoodBreakPointIndex + 1);
          const tokensToAdd = linesToAdd.reduce(
            (sum, l) => sum + countTokens(l),
            0
          );

          currentFileContent += linesToAdd.join("\n") + "\n";
          currentTokenCount += tokensToAdd;

          // Save remaining lines for the next file
          pendingLines = pendingLines.slice(lastGoodBreakPointIndex + 1);
          pendingTokens = pendingTokens - tokensToAdd;
          lastGoodBreakPointIndex = -1;
        } else {
          // If we can't find a good break point, add all pending lines
          // (except for the last one which caused the overflow)
          const linesToAdd = pendingLines.slice(0, -1);
          if (linesToAdd.length > 0) {
            const tokensToAdd = linesToAdd.reduce(
              (sum, l) => sum + countTokens(l),
              0
            );
            currentFileContent += linesToAdd.join("\n") + "\n";
            currentTokenCount += tokensToAdd;

            // Keep only the last line for the next file
            pendingLines = pendingLines.slice(-1);
            pendingTokens = countTokens(pendingLines[0]);
          }
        }

        // Write current content to file and reset
        const outputFilePath = createOutputFilename(inputFilePath, fileIndex);
        fs.writeFileSync(outputFilePath, currentFileContent);
        console.log(
          `Created file: ${outputFilePath} (${currentTokenCount} tokens)`
        );

        fileIndex++;
        currentFileContent = "";
        currentTokenCount = 0;
      }

      // If we're starting a new file and have a heading in pending lines, add table of contents reference
      if (
        currentFileContent === "" &&
        pendingLines.length > 0 &&
        fileIndex > 1
      ) {
        // Find the first heading in pending lines to reference in the TOC
        const firstHeadingLine = pendingLines.find((l) => isHeading(l));
        if (firstHeadingLine) {
          const tocLine = `*Continued from part ${fileIndex - 1}*\n\n`;
          currentFileContent += tocLine;
          currentTokenCount += countTokens(tocLine);
        }
      }
    }

    // Add any remaining pending lines to the current content
    if (pendingLines.length > 0) {
      currentFileContent += pendingLines.join("\n") + "\n";
      currentTokenCount += pendingTokens;
    }

    // Write any remaining content to a file
    if (currentTokenCount > 0) {
      const outputFilePath = createOutputFilename(inputFilePath, fileIndex);
      fs.writeFileSync(outputFilePath, currentFileContent);
      console.log(
        `Created file: ${outputFilePath} (${currentTokenCount} tokens)`
      );
    }

    // Add navigation to all files
    addNavigationToFiles(inputFilePath, fileIndex);

    console.log(`\nProcess completed:`);
    console.log(`Total tokens: ${totalTokenCount}`);
    console.log(`Total lines: ${lineCount}`);
    console.log(`Split into ${fileIndex} files with navigation links`);

    // Create an index file that links to all parts
    createIndexFile(inputFilePath, fileIndex);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Create an index file that links to all parts
function createIndexFile(inputFilePath, totalParts) {
  const parsedPath = path.parse(inputFilePath);
  const indexPath = path.join(
    parsedPath.dir,
    `${parsedPath.name}-index${parsedPath.ext}`
  );

  let indexContent = `# ${parsedPath.name} - Index\n\nThis document has been split into ${totalParts} parts to keep each file under the token limit.\n\n`;
  indexContent += "## Parts\n\n";

  for (let i = 1; i <= totalParts; i++) {
    const partFileName = getBasename(createOutputFilename(inputFilePath, i));
    indexContent += `- [Part ${i}](${partFileName})\n`;
  }

  fs.writeFileSync(indexPath, indexContent);
  console.log(`Created index file: ${indexPath}`);
}

// Process command line arguments
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node md-splitter.js <markdown-file> [max-tokens]");
    console.log("Example: node md-splitter.js document.md 32000");
    process.exit(1);
  }

  const inputFilePath = args[0];
  const maxTokens = args[1] ? parseInt(args[1], 10) : 32000;

  if (isNaN(maxTokens) || maxTokens <= 0) {
    console.error("Error: max-tokens must be a positive number");
    process.exit(1);
  }

  splitMarkdownFile(inputFilePath, maxTokens);
}

main();
