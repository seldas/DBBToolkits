/**
 * Pure BibTeX parsing, deduplication, and cleaning utilities.
 */

export function findClosingBrace(text, openBraceIndex) {
    let braceCount = 1;
    let inString = false;
    let escape = false;
    for (let j = openBraceIndex + 1; j < text.length; j++) {
        const char = text[j];
        if (escape) {
            escape = false;
            continue;
        }
        if (char === '\\') {
            escape = true;
            continue;
        }
        if (inString) {
            if (char === '"') inString = false;
            continue;
        }
        if (char === '"') {
            inString = true;
            continue;
        }
        if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
                return j;
            }
        }
    }
    return -1;
}

export function parseBibTeXFields(fieldsString) {
    const fields = {};
    let i = 0;
    while (i < fieldsString.length) {
        const eq = fieldsString.indexOf('=', i);
        if (eq === -1) break;

        let name = fieldsString.substring(i, eq).trim();
        name = name.replace(/^[\s,]+|[\s,]+$/g, '');
        if (!name) {
            i = eq + 1;
            continue;
        }

        let valStart = eq + 1;
        while (valStart < fieldsString.length && /\s/.test(fieldsString[valStart])) {
            valStart++;
        }

        let value = '';
        let valEnd = valStart;
        if (fieldsString[valStart] === '{') {
            const endBrace = findClosingBrace(fieldsString, valStart);
            if (endBrace !== -1) {
                value = fieldsString.substring(valStart + 1, endBrace);
                valEnd = endBrace + 1;
            } else {
                value = fieldsString.substring(valStart + 1);
                valEnd = fieldsString.length;
            }
        } else if (fieldsString[valStart] === '"') {
            let inEscape = false;
            let endQuote = -1;
            for (let j = valStart + 1; j < fieldsString.length; j++) {
                if (inEscape) {
                    inEscape = false;
                    continue;
                }
                if (fieldsString[j] === '\\') {
                    inEscape = true;
                    continue;
                }
                if (fieldsString[j] === '"') {
                    endQuote = j;
                    break;
                }
            }
            if (endQuote !== -1) {
                value = fieldsString.substring(valStart + 1, endQuote);
                valEnd = endQuote + 1;
            } else {
                value = fieldsString.substring(valStart + 1);
                valEnd = fieldsString.length;
            }
        } else {
            const nextComma = fieldsString.indexOf(',', valStart);
            if (nextComma !== -1) {
                value = fieldsString.substring(valStart, nextComma).trim();
                valEnd = nextComma + 1;
            } else {
                value = fieldsString.substring(valStart).trim();
                valEnd = fieldsString.length;
            }
        }

        value = value.replace(/\s+/g, ' ').trim();
        fields[name] = value;
        i = valEnd;
    }
    return fields;
}

export function wrapCapitalizedTitleWords(title) {
    const lowerStopWords = new Set([
        'A', 'An', 'The', 'And', 'But', 'Or', 'For', 'Nor', 'On', 'In', 'At', 'To', 'By', 'Of', 'With',
    ]);
    const words = title.split(/(\s+)/);
    const newWords = words.map((word, index) => {
        const trimmed = word.trim();
        if (!trimmed) return word;

        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            return word;
        }

        if (/^[.,\/#!$%\^&\*;:{}=\-_`~()]+$/.test(trimmed)) {
            return word;
        }

        const alphaWord = trimmed.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]+$/g, '');
        let hasCapitals = false;

        if (alphaWord.length > 0) {
            const rest = alphaWord.substring(1);
            if (index === 0) {
                // First word: wrap only if it has capitals beyond the first letter
                hasCapitals = /[A-Z]/.test(rest);
            } else {
                const isCapital = /[A-Z]/.test(alphaWord);
                const isStopWord = lowerStopWords.has(alphaWord);
                hasCapitals = isCapital && !isStopWord;
            }
        }

        if (hasCapitals) {
            const trailingPunct = trimmed.substring(alphaWord.length);
            return `{${alphaWord}}${trailingPunct}`;
        }
        return word;
    });
    return newWords.join('');
}

export function cleanBibTeX(rawText, options = {}) {
    let entries = [];
    let i = 0;

    while (i < rawText.length) {
        const index = rawText.indexOf('@', i);
        if (index === -1) break;

        const openBraceIndex = rawText.indexOf('{', index);
        if (openBraceIndex === -1) {
            i = index + 1;
            continue;
        }

        const type = rawText.substring(index + 1, openBraceIndex).trim().toLowerCase();

        if (type === 'comment' || type === 'preamble' || type === 'string') {
            const endBrace = findClosingBrace(rawText, openBraceIndex);
            if (endBrace !== -1) {
                entries.push({ type, raw: rawText.substring(index, endBrace + 1), isMeta: true });
                i = endBrace + 1;
            } else {
                i = openBraceIndex + 1;
            }
            continue;
        }

        const endBrace = findClosingBrace(rawText, openBraceIndex);
        if (endBrace === -1) {
            i = openBraceIndex + 1;
            continue;
        }

        const entryBody = rawText.substring(openBraceIndex + 1, endBrace);
        const firstComma = entryBody.indexOf(',');
        let citationKey = '';
        let fieldsString = '';

        if (firstComma !== -1) {
            citationKey = entryBody.substring(0, firstComma).trim();
            fieldsString = entryBody.substring(firstComma + 1);
        } else {
            citationKey = entryBody.trim();
        }

        const fields = parseBibTeXFields(fieldsString);
        entries.push({
            type,
            key: citationKey,
            fields,
            raw: rawText.substring(index, endBrace + 1),
        });

        i = endBrace + 1;
    }

    if (options.dedup) {
        const seenKeys = new Set();
        const seenTitles = new Set();
        const seenDOIs = new Set();
        const uniqueEntries = [];

        for (const entry of entries) {
            if (entry.isMeta) {
                uniqueEntries.push(entry);
                continue;
            }

            const doi = entry.fields?.doi
                ? entry.fields.doi.toLowerCase().replace(/https?:\/\/doi\.org\//, '').trim()
                : '';
            const title = entry.fields?.title
                ? entry.fields.title.toLowerCase().replace(/[\{\}]/g, '').replace(/\s+/g, ' ').trim()
                : '';
            const key = entry.key ? entry.key.trim() : '';

            let isDuplicate = false;
            if (doi && seenDOIs.has(doi)) isDuplicate = true;
            else if (title && seenTitles.has(title)) isDuplicate = true;
            else if (key && seenKeys.has(key)) isDuplicate = true;

            if (!isDuplicate) {
                if (doi) seenDOIs.add(doi);
                if (title) seenTitles.add(title);
                if (key) seenKeys.add(key);
                uniqueEntries.push(entry);
            }
        }
        entries = uniqueEntries;
    }

    const extraKeys = new Set(['file', 'note', 'epub', 'url', 'issn', 'isbn']);
    let outputText = '';

    for (const entry of entries) {
        if (entry.isMeta) {
            outputText += `${entry.raw}\n\n`;
            continue;
        }

        const cleanedFields = {};
        for (const key in entry.fields) {
            const lowKey = key.toLowerCase();

            if (lowKey === 'abstract' && options.stripAbstract) continue;
            if (lowKey === 'keywords' && options.stripKeywords) continue;
            if (extraKeys.has(lowKey) && options.stripExtras) continue;

            if (lowKey === 'doi' && !options.keepDoi && options.stripExtras) {
                continue;
            }

            let val = entry.fields[key];
            if (lowKey === 'title' && options.wrapTitles) {
                val = wrapCapitalizedTitleWords(val);
            }

            cleanedFields[key] = val;
        }

        outputText += `@${entry.type}{${entry.key},\n`;
        const fieldLines = [];
        for (const key in cleanedFields) {
            fieldLines.push(`  ${key} = {${cleanedFields[key]}}`);
        }
        outputText += fieldLines.join(',\n');
        outputText += `\n}\n\n`;
    }

    return outputText.trim();
}
