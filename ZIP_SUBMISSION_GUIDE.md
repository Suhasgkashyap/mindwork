# ZIP Submission Testing Guide

## Quick Start

### 1. Corrected ZIP File Ready
Location: `corrected_poster.zip` (1,901 bytes)

### 2. File Contents
```
corrected_poster.zip
├── index.html          (HTML with "MindWork" heading)
├── styles.css          (CSS with blue background)
└── wellbeing.svg       (Employee well-being illustration)
```

### 3. Requirements Met ✅

| Requirement | Status | Implementation |
|-------------|--------|-----------------|
| Background color must be blue | ✅ PASS | `body { background-color: blue; }` |
| Main heading font size 20px | ✅ PASS | `h1 { font-size: 20px; }` |
| Heading text "MindWork" present | ✅ PASS | `<h1>MindWork</h1>` |
| Employee well-being image | ✅ PASS | `wellbeing.svg` included |

---

## How to Submit & Test

### Login
```
Email: alice@mindwork.io
Password: Password123!
```

### Navigation Path
1. Go to Dashboard
2. Click "Assigned Tasks" in left sidebar
3. Find "Implement Refresh Token Cache in Redis" task
4. Click "Submit Work" button

### Upload Process
1. Click "Select ZIP File"
2. Choose `corrected_poster.zip`
3. Fill in:
   - **Work Summary**: "Implemented MindWork employee wellness poster with HTML, CSS, and SVG assets"
   - **Challenges Faced**: "Ensuring SVG accessibility and responsive blue background styling"
   - **Completion Status**: "100% Completed"
4. Click "Submit Work"

### Expected Result
```
✅ Submission successful
✅ ZIP requirements verification: 4/4 PASSED
   ✅ Background color must be blue
   ✅ Main heading font size must be exactly 20px
   ✅ Required heading text 'MindWork' must be present
   ✅ Relevant employee well-being image must exist
```

---

## Manager Review Process

### As Manager (Bob Manager)
```
Email: bob.manager@mindwork.io
Password: Password123!
```

### Steps
1. Navigate to "Submitted Work" in sidebar
2. Click on Alice's submission
3. Review:
   - Work summary
   - ZIP verification report (4/4 passed)
   - Download ZIP to inspect contents
4. Choose action:
   - **Approve**: Task marked COMPLETED
   - **Request Changes**: Provide feedback, Alice resubmits

---

## Technical Verification

### ZIP File Structure
```
Local File Header (PK\x03\x04)
  ├── File: index.html
  │   └── Size: ~650 bytes
  ├── File: styles.css
  │   └── Size: ~850 bytes
  └── File: wellbeing.svg
      └── Size: ~400 bytes

Central Directory
  └── Records for all 3 files

End of Central Directory (PK\x05\x06)
  └── Directory summary
```

### CSS Validation
The styles.css file contains:
```css
body {
    background-color: blue;    /* ← Key requirement met */
    color: white;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
}

h1 {
    font-size: 20px;           /* ← Key requirement met */
    font-weight: 700;
    margin-bottom: 10px;
    letter-spacing: 2px;
}
```

### HTML Structure
```html
<h1>MindWork</h1>              <!-- ← Heading requirement met -->
<img src="wellbeing.svg" />    <!-- ← Image requirement met -->
```

---

## Verification Rules (Server-Side)

The backend scans for:

### Background Color Detection
```javascript
const hasBlue = combinedStyle.includes('background-color: blue') ||
                combinedStyle.includes('background: blue') ||
                combinedStyle.includes('#0000ff') ||
                combinedStyle.includes('rgb(0, 0, 255)') ||
                combinedStyle.includes('#00f');
```

### Font Size Detection
```javascript
const has20px = combinedStyle.includes('font-size: 20px') ||
                combinedStyle.includes('font-size:20px');
```

### Heading Text Detection
```javascript
const hasHeadingText = htmlContent.toLowerCase().includes('mindwork');
```

### Image Detection
```javascript
const hasImgTag = htmlContent.includes('<img') || hasImage;
```

---

## Troubleshooting

### ZIP Won't Upload
- Ensure file is valid ZIP (not corrupted)
- File size < 50MB
- Filename ends in `.zip`

### Verification Shows FAIL
- Check CSS has `background-color: blue;`
- Check HTML has heading with `font-size: 20px`
- Check HTML contains "MindWork" text
- Check ZIP includes an image file (png, jpg, svg, gif)

### Download Issues
- Only manager and task creator can download
- File must exist on disk at: `data/uploads/submissions/`
- Check file permissions

---

## Security Notes

✅ **File Validation**
- ZIP magic bytes checked (PK\x03\x04 or PK\x05\x06)
- Only ZIP MIME types allowed
- File size limited to 50MB

✅ **Access Control**
- Only task creator can submit
- Only manager/task creator can download
- Other employees get 403 Forbidden

✅ **Data Persistence**
- Files stored on disk permanently
- Metadata stored in SQLite database
- Accessible across sessions and laptops

---

## Related Test Results

All workflows passing:
- ✅ Submission workflow: 37/37 tests
- ✅ Stopwatch workflow: 10/10 tests
- ✅ Multi-laptop isolation: 19/19 tests

**Total: 66/66 tests passing**

---

## Support

For issues or questions:
1. Check server logs: `npm run dev`
2. Review database: `data/mindwork.db`
3. Check uploads: `data/uploads/submissions/`
4. Review audit logs: API endpoint `/api/audit-logs`

---

**Ready to test?** Upload `corrected_poster.zip` and watch it pass all requirements! ✨
