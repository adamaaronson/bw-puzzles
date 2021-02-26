// (c) 2016-2020 Alex Boisvert
// licensed under MIT license
// https://opensource.org/licenses/MIT

// Helper function to get the next Friday (or whatever)
function getNextDayOfWeek(date, dayOfWeek) {
    // Code to check that date and dayOfWeek are valid left as an exercise ;)
    var resultDate = new Date(date.getTime());
    resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
    return resultDate;
}

/** Draw a crossword grid (requires jsPDF) **/
function draw_crossword_grid(doc, puzdata, options) {
    var DEFAULT_OPTIONS = {
        grid_letters: true,
        grid_numbers: true,
        x0: 20,
        y0: 20,
        cell_size: 24,
        gray: 0.2
    };

    for (var key in DEFAULT_OPTIONS) {
        if (!DEFAULT_OPTIONS.hasOwnProperty(key)) continue;
        if (!options.hasOwnProperty(key)) {
            options[key] = DEFAULT_OPTIONS[key];
        }
    }

    var PTS_TO_IN = 72;
    var cell_size = options.cell_size;

    /** Function to draw a square **/
    function draw_square(doc, x1, y1, cell_size, number, letter, filled, circle) {
        var filled_string = (filled ? 'F' : '');
        var number_offset = cell_size / 20;
        var number_size = cell_size / 3.5;
        var letter_size = cell_size / 1.5;
        var letter_pct_down = 4 / 5;
        doc.setFillColor(options.gray.toString());
        // We draw both an unfilled and filled square
        doc.setDrawColor(options.gray.toString());
        doc.rect(x1, y1, cell_size, cell_size, '');
        doc.rect(x1, y1, cell_size, cell_size, filled_string);
        //numbers
        doc.setFontSize(number_size);
        doc.text(x1 + number_offset, y1 + number_size, number);

        // letters
        doc.setFontSize(letter_size);
        doc.text(x1 + cell_size / 2, y1 + cell_size * letter_pct_down, letter, null, null, 'center');

        // circles
        if (circle) {
            doc.circle(x1 + cell_size / 2, y1 + cell_size / 2, cell_size / 2);
        }
    }

    var width = puzdata.width;
    var height = puzdata.height;
    for (var i = 0; i < height; i++) {
        var y_pos = options.y0 + i * cell_size;
        for (var j = 0; j < width; j++) {
            var x_pos = options.x0 + j * cell_size;
            var grid_index = j + i * width;
            var filled = false;

            // Letters
            var letter = puzdata.solution.charAt(grid_index);
            if (letter == '.') {
                filled = true;
                letter = '';
            }
            // Numbers
            if (!options.grid_letters) {
                letter = '';
            }
            var number = puzdata.sqNbrs[grid_index];
            if (!options.grid_numbers) {
                number = '';
            }

            // Circle
            var circle = puzdata.circles[grid_index];
            draw_square(doc, x_pos, y_pos, cell_size, number, letter, filled, circle);
        }
    }
}

/** Create a PDF (requires jsPDF) **/

function puzdata_to_pdf_bwp(puzdata, options) {
    var DEFAULT_OPTIONS = {
        margin: 40,
        title_pt: 12,
        author_pt: 12,
        copyright_pt: 12,
        num_columns: null,
        num_full_columns: null,
        column_padding: 10,
        gray: 0.2,
        vertical_separator: 5,
        max_clue_pt: 14,
        min_clue_pt: 5,
        grid_padding: 5,
        outfile: null,
        puzzle_date: null
    };

    var notepad = {
        'max_pt': 12,
        'max_lines': 1
    };
    var MAX_NOTEPAD_LINE_LENGTH = 80;

    // Set author if it doesn't exist
    if (!puzdata.author.length) {
        puzdata.author = 'Puzzle by the Beyond Wordplay team';
    }
    puzdata.author = puzdata.author.trim();

    // We change the notepad height for especially long notepads
    puzdata.notes = puzdata.notes.trim();
    if (puzdata.notes.length > MAX_NOTEPAD_LINE_LENGTH) {
        notepad = {
            'max_pt': 20,
            'max_lines': 2
        };
    }

    for (var key in DEFAULT_OPTIONS) {
        if (!DEFAULT_OPTIONS.hasOwnProperty(key)) continue;
        if (!options.hasOwnProperty(key)) {
            options[key] = DEFAULT_OPTIONS[key];
        }
    }

    // Set the date if it isn't pre-set
    var today;
    if (!options.puzzle_date) {
        // Get current date
        today = new Date();
    } else {
        today = new Date();
    }
    //console.log(today);
    var this_year = today.getFullYear();
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var today_str = months[today.getMonth()] + ' ' + this_year;

    // Set copyright if doesn't exist
    if (!puzdata.copyright) {
        puzdata.copyright = '\u00A9 ' + this_year + ' Beyond Wordplay';
    }

    // If there's no filename, just call it puz.pdf
    if (!options.outfile) options.outfile = 'puz.pdf';

    // If options.num_columns is null, we determine it ourselves
    if (!options.num_columns || !options.num_full_columns) {
        if (puzdata.height > 17) {
            options.num_columns = 5;
            options.num_full_columns = 2;
        } else if (puzdata.width >= 17) {
            options.num_columns = 4;
            options.num_full_columns = 1;
        } else {
            options.num_columns = 3;
            options.num_full_columns = 1;
        }
    }


    // The maximum font size of title and author
    var max_title_author_pt = Math.max(options.title_pt, options.author_pt);

    var PTS_PER_IN = 72;
    var DOC_WIDTH = 8.5 * PTS_PER_IN;
    var DOC_HEIGHT = 11 * PTS_PER_IN;

    var margin = options.margin;

    var doc;


    // create the clue strings and clue arrays
    var across_clues = [];
    for (var i = 0; i < puzdata.acrossSqNbrs.length; i++) {
        var num = puzdata.acrossSqNbrs[i].toString();
        var clue = puzdata.across_clues[num];
        // replace a certain clue with a certain emoji
        //if (clue.indexOf('Picard') !== -1)
        //if (clue == 'Dismayed Jean-Luc Picard gesture in a popular meme') {
        //    clue = 'PPP';
        //}
        var this_clue_string = num + '. ' + clue;
        if (i === 0) {
            across_clues.push('ACROSS\n' + this_clue_string);
        } else {
            across_clues.push(this_clue_string);
        }
    }
    // For space between clue lists
    across_clues.push('');

    var down_clues = [];
    for (var i = 0; i < puzdata.downSqNbrs.length; i++) {
        var num = puzdata.downSqNbrs[i].toString();
        var clue = puzdata.down_clues[num];
        var this_clue_string = num + '. ' + clue;
        if (i === 0) {
            down_clues.push('DOWN\n' + this_clue_string);
        } else {
            down_clues.push(this_clue_string);
        }
    }

    // size of columns
    var col_width = (DOC_WIDTH - 2 * margin - (options.num_columns - 1) * options.column_padding) / options.num_columns;

    // The grid is under all but the first column
    var grid_width = DOC_WIDTH - 2 * margin - options.num_full_columns * (col_width + options.column_padding);
    var grid_height = (grid_width / puzdata.width) * puzdata.height;

    // Reserve spot for the notepad
    var notepad_ypos = DOC_HEIGHT - margin - options.copyright_pt - options.vertical_separator * 2;
    var notepad_xpos = DOC_WIDTH - margin - grid_width / 2;

    // x and y position of grid
    var grid_xpos = DOC_WIDTH - margin - grid_width;
    var grid_ypos = notepad_ypos - options.vertical_separator - notepad.max_pt - grid_height;

    // Loop through and write to PDF if we find a good fit
    // Find an appropriate font size
    var clue_pt = options.max_clue_pt;
    var finding_font = true;
    while (finding_font) {
        doc = new jsPDF({orientation: 'portrait', unit: 'pt', format: 'letter'});
        var clue_padding = clue_pt / 3;
        doc.setFontSize(clue_pt);

        // Print the clues
        var line_xpos = margin;
        var top_line_ypos = margin + // top margin
            max_title_author_pt + // date, site name
            options.vertical_separator + // spacing
            max_title_author_pt + // title, URL
            options.vertical_separator * 2 + // padding
            clue_pt + clue_padding; // first clue
        var line_ypos = top_line_ypos;
        var my_column = 0;
        var clue_arrays = [across_clues, down_clues];
        for (var k = 0; k < clue_arrays.length; k++) {
            var clues = clue_arrays[k];
            for (var i = 0; i < clues.length; i++) {
                var clue = clues[i];
                // check to see if we need to wrap
                var max_line_ypos;
                if (my_column < options.num_full_columns) {
                    max_line_ypos = DOC_HEIGHT - margin - options.copyright_pt - 2 * options.vertical_separator;
                } else {
                    max_line_ypos = grid_ypos - options.grid_padding;
                }

                // Split our clue
                var lines = doc.splitTextToSize(clue, col_width);

                if (line_ypos + (lines.length - 1) * (clue_pt + clue_padding) > max_line_ypos) {
                    // move to new column
                    my_column += 1;
                    line_xpos = margin + my_column * (col_width + options.column_padding);
                    line_ypos = top_line_ypos;
                    // if we're at the top of a line we don't print a blank clue
                    if (clue == '') {
                        continue;
                    }
                }

                for (var j = 0; j < lines.length; j++) {
                    // Set the font to bold for the title
                    if (i == 0 && j == 0) {
                        doc.setFontType('bold');
                    } else {
                        doc.setFontType('normal');
                    }
                    var line = lines[j];
                    // print the text
                    doc.text(line_xpos, line_ypos, line);

                    // set the y position for the next line
                    line_ypos += clue_pt + clue_padding;
                }
            }
        }

        // let's not let the font get ridiculously tiny
        if (clue_pt == options.min_clue_pt) {
            finding_font = false;
        } else if (my_column > options.num_columns - 1) {
            clue_pt -= 0.1;
        } else {
            finding_font = false;
        }
    }


    /***********************/

    // If title_pt or author_pt are null, we determine them
    var DEFAULT_TITLE_PT = 12;
    var total_width = DOC_WIDTH - 2 * margin;
    if (!options.author_pt) options.author_pt = options.title_pt;
    if (!options.title_pt) {
        options.title_pt = DEFAULT_TITLE_PT;
        var finding_title_pt = true;
        while (finding_title_pt) {
            var title_author = puzdata.title + 'asdfasdf' + 'https://beyondwordplay.com';
            doc.setFontSize(options.title_pt)
                .setFontType('bold');
            var lines = doc.splitTextToSize(title_author, DOC_WIDTH);
            if (lines.length == 1) {
                finding_title_pt = false;
            } else {
                options.title_pt -= 1;
            }
        }
        options.author_pt = options.title_pt;
    }



    /* Render title and author and such */
    var date_xpos = margin;
    var site_name_xpos = DOC_WIDTH - margin;
    var date_site_name_ypos = margin + max_title_author_pt;
    //date
    doc.setFontSize(options.title_pt);
    doc.setFontType('bold');
    doc.text(date_xpos, date_site_name_ypos, today_str);

    //site name
    doc.setFontSize(options.author_pt);
    doc.setFontType('normal');
    doc.text(site_name_xpos, date_site_name_ypos, "Beyond Wordplay Crossword Contest", null, null, 'right');

    var title_xpos = margin;
    var url_xpos = DOC_WIDTH - margin;
    var title_url_ypos = date_site_name_ypos + max_title_author_pt + options.vertical_separator;
    // title and author
    doc.setFontSize(options.title_pt);
    doc.setFontType('bold');
    doc.text(title_xpos, title_url_ypos, puzdata.title);

    // URL
    doc.setFontSize(options.author_pt);
    doc.setFontType('normal');
    doc.text(url_xpos, title_url_ypos, 'https://beyondwordplay.com', null, null, 'right');

    // Draw a line under the headers
    var line_x1 = margin;
    var line_x2 = DOC_WIDTH - margin;
    var line_y = title_url_ypos + options.vertical_separator;
    doc.line(line_x1, line_y, line_x2, line_y);

    /* Render copyright */
    var copyright_xpos = DOC_WIDTH - margin;
    var copyright_ypos = DOC_HEIGHT - margin;
    doc.setFontSize(options.copyright_pt);
    doc.text(copyright_xpos, copyright_ypos, puzdata.copyright, null, null, 'right');

    /* Render author */
    var author_xpos = margin;
    var author_ypos = copyright_ypos;
    doc.setFontSize(options.copyright_pt);
    //doc.text(author_xpos,author_ypos,puzdata.author);
    doc.text(author_xpos, author_ypos, '');

    /* Draw a line above the copyright */
    var line2_x1 = line_x1;
    var line2_x2 = line_x2;
    var line2_y = copyright_ypos - options.copyright_pt - options.vertical_separator;
    doc.line(line2_x1, line2_y, line2_x2, line2_y);

    /* Render notepad */
    // Determine font size
    doc.setFontType('italic');
    var notepad_pt = (notepad.max_pt - 2) / notepad.max_lines;
    doc.setFontSize(notepad_pt);
    var notepad_lines = doc.splitTextToSize(puzdata.notes, grid_width - 20);
    console.log(puzdata.notes);
    while (notepad_lines.length > notepad.max_lines) {
        console.log(notepad_pt);
        console.log(notepad_lines);
        notepad_pt -= 0.2;
        //console.log(notepad_pt);
        doc.setFontSize(notepad_pt);
        notepad_lines = doc.splitTextToSize(puzdata.notes, grid_width - 20);
    }
    console.log(notepad_pt);
    //alert(notepad_pt);
    // We can move notepad_ypos up a bit depending on notepad_pt
    //notepad_ypos = grid_ypos + grid_height + options.vertical_separator + (notepad.max_pt + notepad_pt)/2;
    notepad_ypos = grid_ypos + grid_height + options.vertical_separator + notepad_pt;
    var notepad_options = {
        'align': 'center',
        'lineHeightFactor': 1
    };
    notepad1 = puzdata.notes;
    notepad2 = '';
    if (notepad1.length > MAX_NOTEPAD_LINE_LENGTH) {
        var cutoff_index = puzdata.notes.indexOf(' ', notepad1.length / 2);
        notepad1 = puzdata.notes.substr(0, cutoff_index);
        notepad2 = puzdata.notes.substr(cutoff_index + 1);
    }

    doc.text(notepad_xpos, notepad_ypos, notepad1, null, null, 'center');
    if (notepad2) {
        doc.text(notepad_xpos, notepad_ypos + notepad_pt, notepad2, null, null, 'center');
    }
    doc.setFontType('normal');

    // Testing rectangle
    //doc.rect(grid_xpos, grid_ypos + grid_height + options.vertical_separator, grid_width, notepad_pt);

    // Draw a rectangle around the notepad
    var notepad_rect_y = grid_ypos + grid_height + options.vertical_separator;
    var notepad_rect_x = grid_xpos;
    var notepad_rect_w = grid_width;
    var notepad_adj = (notepad.max_lines == 2 ? 1.2 : 1.4);
    var notepad_rect_h = notepad_pt * notepad.max_lines * notepad_adj;
    var notepad_rect_radius = notepad_pt / 2.5;
    doc.roundedRect(notepad_rect_x, notepad_rect_y, notepad_rect_w, notepad_rect_h, notepad_rect_radius, notepad_rect_radius);

    /* Draw grid */

    var grid_options = {
        grid_letters: false,
        grid_numbers: true,
        x0: grid_xpos,
        y0: grid_ypos,
        cell_size: (grid_width / puzdata.width),
        gray: options.gray
    };
    draw_crossword_grid(doc, puzdata, grid_options);

    doc.save(options.outfile);
}
