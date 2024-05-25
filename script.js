document.addEventListener("DOMContentLoaded", function () {
    let selectedHour = localStorage.getItem('selectedHour');
    let selectedMinute = localStorage.getItem('selectedMinute');
    let isSelectingHour = true;
    let isSelectingFirstTime = true;
    let startAngle = parseFloat(localStorage.getItem('startAngle'));
    let endAngle = parseFloat(localStorage.getItem('endAngle'));
    const fixedRadius = 180;
    let mappedCoordinates = JSON.parse(localStorage.getItem('mappedCoordinates')) || [];
    const plottedDots = JSON.parse(localStorage.getItem('plottedDots')) || [];

    const initClock = (containerId, isHour = true) => {
        const numbersContainer = document.getElementById(containerId);
        const clockRadius = 200;
        const numberRadius = 150;
    
        numbersContainer.innerHTML = '';
        numbersContainer.replaceWith(numbersContainer.cloneNode(true));
        const newNumbersContainer = document.getElementById(containerId);
    
        const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')); // 24-hour format
        const numbers = isHour ? hours : ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
    
        numbers.forEach((number, index) => {
            const angle = (index * (360 / numbers.length) - 90) * (Math.PI / 180); // Adjust angle for 24 numbers
            const x = clockRadius + numberRadius * Math.cos(angle);
            const y = clockRadius + numberRadius * Math.sin(angle);
    
            const numberElement = document.createElement('div');
            numberElement.className = 'number';
            numberElement.style.left = `${x}px`;
            numberElement.style.top = `${y}px`;
            numberElement.textContent = number;
            newNumbersContainer.appendChild(numberElement);
        });
    
        const handleClick = (event) => {
            const rect = newNumbersContainer.getBoundingClientRect();
            const clockCenterX = rect.left + clockRadius;
            const clockCenterY = rect.top + clockRadius;
            const x = event.clientX - clockCenterX;
            const y = event.clientY - clockCenterY;
            const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
            let adjustedAngle = angle < 0 ? angle + 360 : angle;
            let index = Math.floor((adjustedAngle + (360 / numbers.length) / 2) / (360 / numbers.length)) % numbers.length;
            let selectedNumber = numbers[index];
        
            console.log(`Selected Index: ${index}, Angle: ${angle.toFixed(2)}, Adjusted Angle: ${adjustedAngle.toFixed(2)}`); // More detailed debugging
        
            if (isSelectingHour) {
                selectedHour = selectedNumber;
                localStorage.setItem('selectedHour', selectedHour);
                console.log(`Selected Hour: ${selectedHour}`); // Debugging output
                isSelectingHour = false;
                initClock(containerId, false);
            } else {
                selectedMinute = selectedNumber;
                localStorage.setItem('selectedMinute', selectedMinute);
                const selectedTime = `${selectedHour}:${selectedMinute}`;
                console.log(`Selected Time: ${selectedTime}`); // Debugging output
                alert(`Selected time: ${selectedTime}`);
                isSelectingHour = true;
                initClock(containerId, true);    

                let hourAngle;
                if (selectedHour === '24') {
                    hourAngle = 0;
                } else {
                    hourAngle = selectedHour * 15 % 360;
                }

                let minuteAngle = selectedMinute * 0.25;
                let totalAngle = hourAngle + minuteAngle;
                const totalAngleInRadians = totalAngle * (Math.PI / 180);

                if (isSelectingFirstTime) {
                    startAngle = totalAngleInRadians - (Math.PI / 2);
                    localStorage.setItem('startAngle', startAngle);
                    isSelectingFirstTime = false;
                } else {
                    const name = "Default Line Name";
                    const color = getRandomColor();
                    endAngle = totalAngleInRadians - (Math.PI / 2);
                    if (endAngle < startAngle) endAngle += 2 * Math.PI;
                    mappedCoordinates = mapCoordinates(fixedRadius, startAngle, endAngle);
                    plottedDots.push({ coordinates: mappedCoordinates, color, name });
                    localStorage.setItem('mappedCoordinates', JSON.stringify(mappedCoordinates));
                    localStorage.setItem('plottedDots', JSON.stringify(plottedDots));
                    console.log('Plotted Dots:', plottedDots); // Debugging
                    plotCoordinates(plottedDots, clockRadius);
                    updateTable(plottedDots); // Update table with new data
                    isSelectingFirstTime = true;
                }
            }
        };

        newNumbersContainer.addEventListener('click', handleClick);
    };

    const mapCoordinates = (r, startAngle, endAngle) => {
        const coordinates = [];
        for (let theta = startAngle; theta <= endAngle; theta += 0.01) {
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            coordinates.push({ x, y });
        }
        return coordinates;
    };

    const plotCoordinates = (dots, clockRadius) => {
        const container = document.querySelector(`.clock`);
        if (!container) {
            console.error('Container not found'); // Debugging
            return;
        }
        console.log('Container:', container); // Debugging
        container.querySelectorAll('.dot, .line-name, .context-menu').forEach(dot => dot.remove());
        dots.forEach((dotData, dotIndex) => {
            dotData.coordinates.forEach(coord => {
                const dot = document.createElement('div');
                dot.className = 'dot';
                dot.style.left = `calc(50% + ${coord.x}px)`;
                dot.style.top = `calc(50% + ${coord.y}px)`;
                dot.style.backgroundColor = dotData.color;
                dot.setAttribute('data-name', dotData.name);
                container.appendChild(dot);

                dot.addEventListener('mouseenter', () => {
                    const nameLabel = document.createElement('div');
                    nameLabel.className = 'line-name';
                    nameLabel.textContent = dotData.name;
                    nameLabel.style.left = '50%';
                    nameLabel.style.top = '50%';
                    container.appendChild(nameLabel);
                });

                dot.addEventListener('mouseleave', () => {
                    const nameLabel = container.querySelector('.line-name');
                    if (nameLabel) nameLabel.remove();
                });

                dot.addEventListener('click', (event) => {
                    event.stopPropagation();
                    showContextMenu(event, dotData, dots, dotIndex, clockRadius, container);
                });
            });
        });
    };

    const showContextMenu = (event, dotData, dots, dotIndex, clockRadius, container) => {
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu context-menu-center';

        const renameButton = document.createElement('button');
        renameButton.textContent = 'Rename';
        renameButton.addEventListener('click', () => {
            showRenameModal(dotData, dots, dotIndex, clockRadius, container, contextMenu);
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            dots.splice(dotIndex, 1);
            localStorage.setItem('plottedDots', JSON.stringify(dots));
            plotCoordinates(dots, clockRadius);
            updateTable(dots); // Update table after deletion
            document.body.removeChild(contextMenu);
        });

        contextMenu.appendChild(renameButton);
        contextMenu.appendChild(deleteButton);
        document.body.appendChild(contextMenu);

        document.addEventListener('click', (event) => {
            if (!contextMenu.contains(event.target)) {
                document.body.removeChild(contextMenu);
            }
        }, { once: true });
    };

    const showRenameModal = (dotData, dots, dotIndex, clockRadius, container, contextMenu) => {
        const modal = document.createElement('div');
        modal.className = 'modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter new name';
        input.value = dotData.name;

        const submitButton = document.createElement('button');
        submitButton.textContent = 'Rename';
        submitButton.addEventListener('click', () => {
            const newName = input.value.trim();
            if (newName) {
                dotData.name = newName;
                dots[dotIndex].name = newName;
                localStorage.setItem('plottedDots', JSON.stringify(dots));
                plotCoordinates(dots, clockRadius);
                updateTable(dots); // Update table after renaming
            }
            document.body.removeChild(modal);
            document.body.removeChild(contextMenu);
        });

        modalContent.appendChild(input);
        modalContent.appendChild(submitButton);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        document.addEventListener('click', (event) => {
            if (!modalContent.contains(event.target) && !contextMenu.contains(event.target)) {
                document.body.removeChild(modal);
            }
        }, { once: true });
    };

    const updateTable = (dots) => {
        const tableBody = document.querySelector('#info-table tbody');
        tableBody.innerHTML = ''; // Clear the table

        dots.forEach(dot => {
            const row = document.createElement('tr');

            const nameCell = document.createElement('td');
            nameCell.textContent = dot.name;
            row.appendChild(nameCell);

            const colorCell = document.createElement('td');
            colorCell.style.backgroundColor = dot.color;
            colorCell.style.width = '50px'; // Set a fixed width for color display
            row.appendChild(colorCell);

            tableBody.appendChild(row);
        });
    };

    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    initClock('numbers', true);
    console.log('Plotted Dots on Load:', plottedDots);
    plotCoordinates(plottedDots, 200);
    updateTable(plottedDots); // Update table on page load

    window.addEventListener('resize', () => {
        isSelectingHour = true;
        initClock('numbers', true);
        plotCoordinates(plottedDots, 200);
        updateTable(plottedDots); // Update table on resize
    });
});
