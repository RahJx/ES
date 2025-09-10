import {disablePasting} from "./phase2anticheat.js";
document.addEventListener('DOMContentLoaded', () => {
    //Opens the optionals UI
    document.getElementById('optionals-button').addEventListener('click', () => {
        document.querySelector('.optionals-wrap').classList.toggle('open');
    });
    let currentlyUsedEmojis = new Set();
    //Anti cheat measure
    disablePasting();
    //Temporarily hardcoded
    let theme = "Horror"
    document.getElementById("textboxlabel").innerHTML = "Current theme: " + theme;

    // Helper function to filter emojis by theme and group by difficulty
    function getEmojisByTheme(emojis, themeName) {
        const pools = {easy: [], medium: [], hard: []};
        for (const emoji of emojis) {
            for (const themeObj of emoji.themes) {
                if (themeObj.name === themeName) {
                    pools[themeObj.difficulty].push(emoji);
                }
            }
        }
        return pools;
    }

    function pickDistinctGroupEmojis(pools) {
        const maxTries = 100; // Safety limit to prevent infinite loops

        for (let i = 0; i < maxTries; i++) {
            // Pick one from each difficulty
            const easyEmojiObj = pools.easy[Math.floor(Math.random() * pools.easy.length)];
            const mediumEmojiObj = pools.medium[Math.floor(Math.random() * pools.medium.length)];
            const hardEmojiObj = pools.hard[Math.floor(Math.random() * pools.hard.length)];
            // Collect all the groups in a Set (automatically removes duplicates)
            const groups = new Set([easyEmojiObj.group, mediumEmojiObj.group, hardEmojiObj.group]);
            // If all 3 groups are unique, a good combination was found
            if (groups.size === 3) {
                return {easy: easyEmojiObj, medium: mediumEmojiObj, hard: hardEmojiObj};
            }
            // Otherwise, try again
        }
        // If we tried 100 times and couldn't find a good combination, throw error
        alert('Could not find emojis with distinct groups after multiple attempts');
    }

    function populateEmojisByGroup(emojis, themeName, pickedEmojis) {
        const groupsMap = {};
        const emojiNamesMap = {};

        // Get the characters of the required emojis to exclude them
        const requiredEmojiChars = [
            pickedEmojis.easy.char,
            pickedEmojis.medium.char,
            pickedEmojis.hard.char
        ];

        // Group emojis by their group property, but exclude required ones
        for (const emoji of emojis) {
            for (const themeObj of emoji.themes) {
                if (themeObj.name === themeName) {
                    // Skip if this emoji is one of the required emojis
                    if (!requiredEmojiChars.includes(emoji.char)) {
                        // Initialize the group array if it doesn't exist
                        if (!groupsMap[emoji.group]) {
                            groupsMap[emoji.group] = [];
                        }
                        groupsMap[emoji.group].push(emoji.char);
                        emojiNamesMap[emoji.char] = emoji.name;
                    }
                }
            }
        }
        // Populate the HTML paragraphs
        for (const groupName in groupsMap) {
            const paragraph = document.getElementById(groupName);
            paragraph.innerHTML = '';
            groupsMap[groupName].forEach(emojiChar => {
                const span = document.createElement('span');
                span.textContent = emojiChar;
                span.classList.add('optional-emoji'); // Add class for styling
                span.setAttribute('data-name', emojiNamesMap[emojiChar]); // Store name in data attribute
                paragraph.appendChild(span);
                paragraph.appendChild(document.createTextNode(' ')); // Add space between emojis
            });
        }
    }

    function hideEmptyGroups() {
        // Array of all group names that match your HTML IDs
        const groupNames = [
            "Smileys & Emotion", "People & Body", "Component",
            "Animals & Nature", "Food & Drink", "Travel & Places",
            "Activities", "Objects", "Symbols", "Flags"
        ];

        groupNames.forEach(groupName => {
            const paragraph = document.getElementById(groupName);
            if (paragraph.textContent.trim() === "") {
                // Find the heading (h2) that comes before this paragraph
                const heading = paragraph.previousElementSibling;

                // Remove both the heading and the empty paragraph
                if (heading && heading.tagName.toLowerCase() === "h2") {
                    heading.remove();
                }
                paragraph.remove();
            }
        });
    }

    function setupOptionalEmojiClicks() {
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('optional-emoji')) {
                const emojiChar = event.target.textContent;
                const textbox = document.getElementById('textbox');

                // Use the same used emoji set as updateEmojiState
                if (!currentlyUsedEmojis.has(emojiChar)) {
                    if (countOptionalEmojisOnly() >= 3) {
                        alert('Maximum 3 optional emojis allowed!');
                        return;
                    }

                    textbox.value += emojiChar;
                    updateEmojiState();
                    updateCharCounterDisplay();
                }
            }
        });
    }

    function countOptionalEmojisOnly() {
        const requiredEmojis = [
            document.getElementById('easy').textContent,
            document.getElementById('medium').textContent,
            document.getElementById('hard').textContent
        ];

        // Count only emojis that are NOT required emojis
        let optionalCount = 0;
        currentlyUsedEmojis.forEach(emoji => {
            if (!requiredEmojis.includes(emoji)) {
                optionalCount++;
            }
        });
        return optionalCount;
    }

    function renderOptionalSlots() {
        const slotEls = [
            document.getElementById('opt-slot-1'),
            document.getElementById('opt-slot-2'),
            document.getElementById('opt-slot-3')
        ];

        // Clear all slots first
        slotEls.forEach(el => el.textContent = '');

        // Build ordered list of used optional emojis with names
        const usedOptional = [];
        const requiredEmojis = [
            document.getElementById('easy').textContent,
            document.getElementById('medium').textContent,
            document.getElementById('hard').textContent
        ];
        const textboxValue = document.getElementById('textbox').value;

        // currentlyUsedEmojis already contains only optional emoji chars (from updateEmojiState)
        currentlyUsedEmojis.forEach(char => {
            if (!requiredEmojis.includes(char)) {
                const span = Array.from(document.querySelectorAll('.optional-emoji'))
                    .find(s => s.textContent === char);
                if (span) {
                    usedOptional.push({char, name: span.getAttribute('data-name') || ''});
                }
            }
        });

        // Sort by appearance order in textbox
        usedOptional.sort((a, b) => textboxValue.indexOf(a.char) - textboxValue.indexOf(b.char));

        // Fill up to 3 slots in order
        usedOptional.slice(0, 3).forEach((item, idx) => {
            slotEls[idx].textContent = `${item.char}- ${item.name}`;
        });
    }

    //Switch to randomize required emojis based on theme (WIP)
    switch (theme) {
        case "Horror":
            fetch('resources/emojis.json')  // Change from import() to fetch()
                .then(response => response.json())
                .then(emojiCatalog => {
                    const horrorEmojis = getEmojisByTheme(emojiCatalog, theme);
                    const pickedEmojis = pickDistinctGroupEmojis(horrorEmojis);
                    document.getElementById("easy").textContent = pickedEmojis.easy.char;
                    document.getElementById("medium").textContent = pickedEmojis.medium.char;
                    document.getElementById("hard").textContent = pickedEmojis.hard.char;
                    document.getElementById("easy-text").textContent = pickedEmojis.easy.name;
                    document.getElementById("medium-text").textContent = pickedEmojis.medium.name;
                    document.getElementById("hard-text").textContent = pickedEmojis.hard.name;
                    updateEmojiState();
                    populateEmojisByGroup(emojiCatalog, theme, pickedEmojis);
                    hideEmptyGroups();
                    setupOptionalEmojiClicks();
                })
                .catch(() => {
                    document.getElementById("textboxlabel").innerHTML = "Error loading emojis!";
                    // Fallback to question marks if loading fails
                    document.getElementById("easy").textContent = "❓";
                    document.getElementById("medium").textContent = "❓";
                    document.getElementById("hard").textContent = "❓";
                    document.getElementById("easy-text").textContent = "NULL";
                    document.getElementById("medium-text").textContent = "NULL";
                    document.getElementById("hard-text").textContent = "NULL";
                    updateEmojiState();
                });
            break;
        case "Mundane":
            //WIP
            break;
        case "Adventure":
            //WIP
            break;
        //I don't think we'll get here, but just in case somehow
        default:
            document.getElementById("textboxlabel").innerHTML = "Error loading theme!";
            document.getElementById("easy").textContent = "❓";
            document.getElementById("medium").textContent = "❓";
            document.getElementById("hard").textContent = "❓";
            updateEmojiState();
            break;
    }

    const textbox = document.getElementById('textbox');
    const difficulties = ['easy', 'medium', 'hard'];

    //A toggle for every required emoji to be used or not used
    function updateEmojiState() {
        const value = textbox.value;
        difficulties.forEach(id => {
            const emh = document.getElementById(id);
            emh.classList.toggle('used', value.includes(emh.textContent));
        });
        currentlyUsedEmojis.clear();
        const optionalEmojis = document.querySelectorAll('.optional-emoji');

        const emojiList = Array.from(optionalEmojis).map(span => span.textContent);
        const sortedEmojis = emojiList.sort((a, b) => b.length - a.length);
        let remainingText = value;

        sortedEmojis.forEach(emoji => {
            if (remainingText.includes(emoji)) {
                currentlyUsedEmojis.add(emoji);
                remainingText = remainingText.replace(emoji, '');
            }
        });

        // Mark emojis as used based on our clean set
        optionalEmojis.forEach(span => {
            span.classList.toggle('used', currentlyUsedEmojis.has(span.textContent));
        });
        // Update counter and display used emoji names
        document.getElementById('optionals-text').textContent =
            `Optionals used: ${countOptionalEmojisOnly()}/3`;

        renderOptionalSlots();
    }

    //If the user clicks on a required emoji, add it
    //to the textbox and mark it as used
    difficulties.forEach(id => {
        const emh = document.getElementById(id);
        emh.addEventListener('click', () => {
            if (!textbox.value.includes(emh.textContent)) {
                textbox.value += emh.textContent;
                updateEmojiState();
                updateCharCounterDisplay();
            }
        })
    })
    //If the emoji ever gets removed from the textbox,
    //make it usable again
    textbox.addEventListener('cut', () => updateEmojiState());


    function timer() {
        //Timer logic
        const clock = ["🕛", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚"];
        let face = 0;
        let sec = 0;
        let min = 3;
        let timerInterval = setInterval(function () {
            //Wait one and a bit seconds to finish Phase 3
            //The bit is there to make sure 0:00 gets on screen
            //Decrement FIRST
            sec--;
            face += 1;


            if (face === clock.length) {
                face = 0;
            }
            //Check if we should remove a minute
            if (sec < 0) {
                sec = 59;
                min--;
            }
            //Then Update visually
            document.getElementById('timer').innerHTML = clock[face] + min + ':' + (sec < 10 ? '0' + sec : sec);

            //Make clock red, and a sound play for intensity in the future
            if (min === 0 && sec === 30) {
                document.getElementById('timer').style.color = "red";
                // const clocksound = document.createElement('clocksound');
                // clocksound.src = './clocksound.wav';
                // clocksound.play();
            }
            //Stop at 0:00
            if (min === 0 && sec === 0) {
                setTimeout(() => {
                    face = 0;
                    grabText();
                    clearInterval(timerInterval);
                }, 1);
            }
            if (min < 0) {
                clearInterval(timerInterval);
            }
        }, 1000);
    }

    timer();

//Will grab text and check its validity
    function grabText() {
        const textbox = document.getElementById('textbox');
        const textValue = textbox.value;

        // Disable the textbox first
        textbox.disabled = true;

        // Get the 3 required emojis
        const requiredEmojis = [
            document.getElementById('easy').textContent,
            document.getElementById('medium').textContent,
            document.getElementById('hard').textContent
        ];

        // Check if all 3 required emojis are present in the story
        const missingRequired = requiredEmojis.filter(emoji => !textValue.includes(emoji));
        const hasAllRequired = missingRequired.length === 0;

        // Check if at least one optional emoji is used
        const optionalCount = countOptionalEmojisOnly();
        const hasOptional = optionalCount > 0;

        // Determine success or failure
        if (hasAllRequired && hasOptional) {
            alert("Success! This is a valid story.\nFeel free to select and ctrl+c your story from the textbox to share it!");
        } else {
            // Build specific failure message
            let failureReason = "Failed to meet all criteria for a valid story!\n\nMissing:";

            if (!hasAllRequired) {
                failureReason += `\n- Required emojis: ${missingRequired.join(', ')}`;
            }

            if (!hasOptional) {
                failureReason += "\n- At least 1 optional emoji";
            }

            alert(failureReason);
        }
    }

    function setupCharCounter() {
        const textbox = document.getElementById('textbox');
        const counter = document.getElementById('char-counter');

        // Use Intl.Segmenter for proper grapheme cluster counting
        const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'});

        function getGraphemeCount(text) {
            return Array.from(segmenter.segment(text)).length;
        }

        function updateCounter() {
            const currentLength = getGraphemeCount(textbox.value);
            counter.textContent = currentLength + '/300';

            // Change color based on count
            if (currentLength >= 250) {
                counter.style.color = 'red';
            } else {
                counter.style.color = 'black';
            }
        }

        // Handle ALL input events with proper length limiting
        textbox.addEventListener('input', () => {
            const currentLength = getGraphemeCount(textbox.value);

            // If over limit, truncate to exactly 300 grapheme clusters
            if (currentLength > 300) {
                const graphemes = Array.from(segmenter.segment(textbox.value));
                textbox.value = graphemes.slice(0, 300).map(g => g.segment).join('');
            }

            // Update both counter and emoji state immediately
            updateCounter();
            updateEmojiState();
        });

        // Prevent paste that would exceed limit
        textbox.addEventListener('paste', () => {
            setTimeout(() => {
                const currentLength = getGraphemeCount(textbox.value);
                if (currentLength > 300) {
                    const graphemes = Array.from(segmenter.segment(textbox.value));
                    textbox.value = graphemes.slice(0, 300).map(g => g.segment).join('');
                    updateCounter();
                    updateEmojiState();
                }
            }, 0);
        });

        // Initialize counter
        updateCounter();
    }
    setupCharCounter();
    function updateCharCounterDisplay() {
        const textbox = document.getElementById('textbox');
        const counter = document.getElementById('char-counter');
        const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'});
        const currentLength = Array.from(segmenter.segment(textbox.value)).length;
        counter.textContent = currentLength + '/300';
        counter.style.color = currentLength >= 250 ? 'red' : 'black';
    }

}); // End of DOMContentLoaded