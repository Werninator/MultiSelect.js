var multiSelect = (function(selector, options) {
    "use strict";

    // Gibt es keinen Selector, gibt es kein Plugin.
    if (!checkType(selector, 'String') || !trim(selector))
        return;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // EINSTELLUNGEN ------------------------------------------------------------------------------------------------ //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var settings = {
        searchBar: true,
        useOptGroups: true,
        elementString: 'Elemente',
        selectedString: 'ausgewählt',
        ofString: 'von',
        searchString: 'Suche...',
        resultString: 'SUCHERGEBNIS(SE)',
        selectAllString: 'ALLE AUSWÄHLEN',
        unselectAllString: 'ALLE ABWÄHLEN',
        discardString: 'ABBRECHEN',
        saveString: 'SPEICHERN',

        // Hooks
        preInit: null,
        postInit: null,
        onDiscard: null,
        onChange: null,
        onSave: null,
        onDropdownOpen: null,
        onDropdownClose: null,
    };

    // Die übergebenen Optionen überschreiben die Standard-Settings
    if (typeof options !== 'undefined')
        for (var property in options)
            if (options.hasOwnProperty(property))
                settings[property] = options[property];

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // NÜTZLICHE FUNKTIONEN ----------------------------------------------------------------------------------------- //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Eigener Exception-Type
    function MultiSelectException(message) {
        this.message = message;
        this.name    = 'MultiSelectException';
    }

    // Holt sich den Typen aus Sicht der toString()-Methode der Objekte in JavaScript
    function getType(value) {
        return Object.prototype.toString.call(value).replace(/^\[object (.+)\]$/, '$1');
    }

    // Überprüft den Typen eines Wertes, kann über "|" aufgetrennt werden falls mehrere Werte abgefragt werden
    function checkType(value, types) {
        types = types.split('|');

        for (var i in types)
            if (getType(value) === types[i])
                return true;

        return false;
    }

    // Erstellt eine unique-id für die Instanzen
    function uniqid() {
        return Math.floor(Math.random() * 1000000) + (new Date().getTime()).toString(16);
    }

    // Erstellt ein HTML-Element
    function createElement(innerHTML) {
        var element       = document.createElement('div');
        element.innerHTML = innerHTML;
        return element.children[0];
    }

    // Triggert ein natives Event
    function triggerEvent(element, eventName) {
        var event = document.createEvent('HTMLEvents');
        event.initEvent(eventName, true, false);
        element.dispatchEvent(event);
    }

    // Wartet bis der Inhalt der Seite geladen ist bevor der Code ausgeführt wird
    function ready(fn) {
        document.readyState != 'loading' && fn() || document.addEventListener('DOMContentLoaded', fn);
    }

    // Trim Funktion
    function trim(str) {
        return str.replace(/^\s+|\s+$/gm, '');
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // DYNAMISCHE FUNKTIONEN (GETTER, SETTER, ADDER) ---------------------------------------------------------------- //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var get = function(that, what) {
        if (typeof that[what] === 'undefined')
            throw new MultiSelectException('get: param 0: no defined value to get');

        switch (true) {
            // Objekt
            case that[what].type == 'Object' && !checkType(that[what].value, 'Array'):
                var retVal = that[what].hasOwnProperty('className') && that[what].value
                    ? new that[what].value.constructor
                    : null;

                for (var property in that[what].value)
                    if (that[what].value.hasOwnProperty(property))
                        retVal[property] = that[what].value[property];

                return retVal;
            case that[what].type == 'Object' && checkType(that[what].value, 'Array'):
            case 'Array': return that[what].value.slice();
            default:      return that[what].value;
        }
    }

    var set = function(that, what, value) {
        if (typeof that[what] === 'undefined')
            throw new MultiSelectException('set: param 0: "' + what + '" is not defined');

        if (!checkType(value, that[what].type))
            throw new MultiSelectException('set: param 1 not typeof ' + that[what].type + ' (is ' + getType(value) + ')');

        if (typeof what === 'undefined')
            throw new MultiSelectException('set: param 0: no defined value to set');

        return (that[what].value = value);
    };

    var add = function(that, what, value) {
        if (typeof that[what] === 'undefined')
            throw new MultiSelectException('add: param 0: no defined value to add something');

        if (!checkType(that[what].value, 'Array'))
            throw new MultiSelectException('add: can\'t push value into a non-array');

        if (typeof value === 'undefined')
            throw new MultiSelectException('add: param 1: Can\'t push nothing into an array');

        if (!checkType(value, that[what].type))
            throw new MultiSelectException('add: param 1: wrong type');

        that[what].value.push(value);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // KLASSEN ------------------------------------------------------------------------------------------------------ //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var msOption = (function() {
        var _private = function() {
            return {
                checked: { value: false, type: 'Boolean' },
                label: { value: '', type: 'String' },
                value: { value: '', type: 'String' },
                disabled: { value: false, type: 'Boolean' },
                isOptionGroup: { value: false, type: 'Boolean' },
                options: { value: [], type: 'Object', className: 'Option' },
                parentOption: { value: null, type: 'Object', className: 'Option' },
                domElement: { value: null, type: 'HTMLOptGroupElement|HTMLOptionElement|HTMLDivElement' },
            };
        };

        var _privateVals = [];

        function msOption(element) {
            this.className = 'Option';
            this.instanceId = uniqid();

            _privateVals[this.instanceId] = _private();

            if (typeof element !== 'undefined')
                this.set('domElement', element);
        };

        // Dynamic get/set/add
        msOption.prototype.get = function(what) { return get(_privateVals[this.instanceId], what) };
        msOption.prototype.set = function(what, value) { return set(_privateVals[this.instanceId], what, value) };
        msOption.prototype.add = function(what, value) { return add(_privateVals[this.instanceId], what, value) };

        msOption.prototype.inheritFromElement = function() {
            var element = this.get('domElement');

            if (element === null)
                return;

            this.set('label', this.get('isOptionGroup')
                ? element.getAttribute('label')
                : element.textContent);


            this.set('disabled', element.disabled)

            if (!this.get('isOptionGroup')) {
                this.set('checked', element.selected);
                this.set('value', element.value);
            }
        };

        msOption.prototype.getUi = function(search) {
            var ext = '-option';

            var label = this.get('label');

            if (this.get('disabled'))
                label = '<i>' + label + '</i>';

            if (search) {
                if (this.get('isOptionGroup') || !~label.indexOf(search))
                    return false;

                var reg = new RegExp('(' + search + ')', 'g');
                label = label.replace(reg, '<b>$1</b>');
            } else {
                if (this.get('isOptionGroup'))
                    ext = '-optgroup';
                else if (this.get('parentOption'))
                    ext += '-in-optgroup';
            }

            return this.set('domElement', createElement('<div class="multiselect-row multiselect' + ext + '">\
                <label class="multiselect-label">\
                    <input type="checkbox" class="multiselect-checkbox" data-opt-inst="' + this.instanceId + '" ' + (this.get('disabled') ? 'disabled' : '') + ' ' + (this.get('checked') ? 'checked' : '') + '> ' + label + '\
                </label>\
            </div>'));
        };

        msOption.prototype.check = function(checked) {
            var i, options;

            this.set('checked', checked);

            if (this.get('isOptionGroup')) {
                options = this.get('options');

                for (i in options)
                    if (!options[i].get('disabled'))
                        options[i].set('checked', checked);
            } else {
                var parent = this.get('parentOption');

                if (!parent)
                    return;

                options = parent.get('options');

                var allSelected = true;

                for (i in options)
                    if (!options[i].get('checked') && !options[i].get('disabled'))
                        allSelected = false;

                parent.set('checked', allSelected);

            }

            // Hook
            if (settings.onChange)
                settings.onChange();
        };

        return msOption;
    })();

    var Dropdown = (function() {
        var _private = function() {
            return {
                domElement: { value: null, type: 'HTMLDivElement' },
            }
        };

        var _privateVals = [];

        function Dropdown() {
            this.className = 'Dropdown';
            this.instanceId = uniqid();

            _privateVals[this.instanceId] = _private();
        };

        // Dynamic get/set
        Dropdown.prototype.get = function(what) { return get(_privateVals[this.instanceId], what) };
        Dropdown.prototype.set = function(what, value) { return set(_privateVals[this.instanceId], what, value) };

        Dropdown.prototype.getUi = function() {
            return this.set('domElement', createElement('<div class="multiselect-container">\
                <div class="multiselect-row-container"></div>\
                <div class="multiselect-row multiselect-row-bottom">\
                    <span class="multiselect-counter"></span>\
                    <span class="multiselect-button multiselect-save">' + settings.saveString + '</span>\
                    <span class="multiselect-button multiselect-cancel">' + settings.discardString + '</span>\
                </div>\
            </div>'));
        };

        Dropdown.prototype.show = function() {
            this.get('domElement').setAttribute('class', 'multiselect-container show');
        };

        Dropdown.prototype.hide = function() {
            this.get('domElement').setAttribute('class', 'multiselect-container');
        };

        return Dropdown;
    })();

    var ToggleButton = (function() {
        var _private = function() {
            return {
                domElement: { value: null, type: 'HTMLButtonElement' },
                label: { value: null, type: 'String' },
            };
        };

        var _privateVals = [];

        function ToggleButton() {
            this.className = 'ToggleButton';
            this.instanceId = uniqid();

            _privateVals[this.instanceId] = _private();
        };

        // Dynamic get/set/add
        ToggleButton.prototype.get = function(what) { return get(_privateVals[this.instanceId], what) };
        ToggleButton.prototype.set = function(what, value) { return set(_privateVals[this.instanceId], what, value) };

        ToggleButton.prototype.getUi = function() {
            return this.set('domElement', createElement('<button class="multiselect-button multiselect-save multiselect-toggle"></button>'));
        };

        ToggleButton.prototype.setLabel = function(text) {
            this.get('domElement').innerHTML = text;
        };

        return ToggleButton;
    })();

    var UIController = (function() {
        var _private = function() {
            return {
                domElement: { value: null, type: 'HTMLSelectElement' },
                options: { value: [], type: 'Object', className: 'Option' },
                dropdown: { value: null, type: 'Object', className: 'Dropdown' },
                toggleButton: { value: null, type: 'Object', className: 'ToggleButton' },
                dropdownIsOpen: { value: false, type: 'Boolean' },
                valueInput: { value: null, type: 'HTMLInputElement' },
                searchBar: { value: null, type: 'HTMLInputElement' }
            };
        };

        var _privateVals = [];

        function UIController(element) {
            this.className = 'UIController';
            this.instanceId = uniqid();

            _privateVals[this.instanceId] = _private();

            if (typeof element !== 'undefined') {
                this.set('domElement', element);
                this.init();
            }
        };

        // Dynamic get/set/add
        UIController.prototype.get = function(what) { return get(_privateVals[this.instanceId], what) };
        UIController.prototype.set = function(what, value) { return set(_privateVals[this.instanceId], what, value) };
        UIController.prototype.add = function(what, value) { return add(_privateVals[this.instanceId], what, value) };

        UIController.prototype.init = function() {
            var that = this;

            var select  = this.get('domElement');
            var options = select.querySelectorAll('optgroup, option');

            var currentOptionGroup = null;

            Array.prototype.forEach.call(options, function(el, i) {
                if (!settings.useOptGroups && el.tagName === 'OPTGROUP')
                    return;

                var option = new msOption(el);

                option.set('isOptionGroup', el.tagName === 'OPTGROUP');

                if (option.get('isOptionGroup'))
                    currentOptionGroup = option;
                else if (currentOptionGroup !== null) {

                    currentOptionGroup.add('options', option);
                    option.set('parentOption', currentOptionGroup);
                }

                option.inheritFromElement();

                if (currentOptionGroup && currentOptionGroup.get('disabled'))
                    option.set('disabled', true);

                that.add('options', option);
            });

            var toggleButton = new ToggleButton(select);
            this.set('toggleButton', toggleButton);

            var dropdown = new Dropdown();
            this.set('dropdown', dropdown);

            this.allocAndReplace(select);
        };

        UIController.prototype.allocAndReplace = function(select) {
            var toggleButton = this.get('toggleButton');
            select.insertAdjacentHTML('afterend', toggleButton.getUi().outerHTML);

            var toggleButtonDOM = select.nextElementSibling;
            toggleButton.set('domElement', toggleButtonDOM);

            var dropdown = this.get('dropdown');
            toggleButtonDOM.insertAdjacentHTML('afterend', dropdown.getUi().outerHTML);

            var dropdownDOM = toggleButtonDOM.nextElementSibling;
            dropdown.set('domElement', dropdownDOM);

            var value = [];

            Array.prototype.forEach.call(select.querySelectorAll('[selected]'), function(selectedOption, i) {
                if (selectedOption.value)
                    value.push(selectedOption.value);
            });

            value = JSON.stringify(value);

            toggleButtonDOM.insertAdjacentHTML('afterend', '<input type="hidden" value=\'' + value + '\' name="' + select.name + '" />');
            var valueInputDOM = toggleButtonDOM.nextElementSibling;

            this.set('valueInput', valueInputDOM);

            select.parentNode.removeChild(select);

            toggleButtonDOM.setAttribute('data-inst', this.instanceId);
            dropdownDOM.setAttribute('data-inst', this.instanceId);

            if (settings.searchBar) {
                dropdownDOM.innerHTML = '<div class="multiselect-row">\
                    <input type="text" class="multiselect-search" placeholder="' + settings.searchString + '">\
                </div>' + dropdownDOM.innerHTML;

                var searchBar = dropdownDOM.querySelector('.multiselect-search');
                this.set('searchBar', searchBar);
            }

            this.updateContent();
        };

        UIController.prototype.updateContent = function() {
            var dropdownDOM  = this.get('dropdown').get('domElement');
            var toggleButtonDOM  = this.get('toggleButton').get('domElement');
            var rowContainer = dropdownDOM.querySelector('.multiselect-row-container');

            var optList = this.getOptionList();

            dropdownDOM.setAttribute('style', 'left: ' + toggleButtonDOM.offsetLeft + 'px; top: ' + (toggleButtonDOM.offsetTop + toggleButtonDOM.offsetHeight + 8) + 'px;');

            rowContainer.innerHTML = '';

            for (var i in optList)
                rowContainer.appendChild(optList[i]);

            var toggleButton = this.get('toggleButton');
            var rowCounter   = dropdownDOM.querySelector('.multiselect-counter');
            var counterText  = this.getSelectedOptionCount() + ' ' + settings.ofString + ' ' + this.getOptionCount();

            toggleButton.setLabel(counterText + ' ' + settings.selectedString);
            rowCounter.innerHTML = counterText;

            this.handleIndeterminate();
        };

        UIController.prototype.handleIndeterminate = function() {
            var controllerOptions = this.get('options');

            for (var j in controllerOptions) {
                if (!controllerOptions[j].get('isOptionGroup'))
                    continue;

                var options = controllerOptions[j].get('options');

                var allSelected    = true;
                var allNotSelected = true;

                for (var i in options) {;
                    if (options[i].get('checked'))
                        allNotSelected = false;

                    if (!options[i].get('checked'))
                        allSelected = false;
                }

                if (!allSelected && !allNotSelected)
                    controllerOptions[j].get('domElement').querySelector('input[type=checkbox]').indeterminate = true;
            }
        }

        UIController.prototype.getOptionList = function() {
            var retVal  = [];

            var options = this.get('options');

            var searchValue = settings.searchBar ? trim(this.get('searchBar').value) : false;


            for (var i in options)
                if (options[i].getUi(searchValue))
                    retVal.push(options[i].getUi(searchValue));

            if (searchValue)
                retVal.unshift(createElement('<div class="multiselect-row multiselect-searchresult-display">\
                    ' + retVal.length + ' ' + settings.resultString + '\
                </div>'))

            return retVal;
        };

        UIController.prototype.getSelectedOptionCount = function() {
            var count = 0;

            var options = this.get('options');

            for (var i in options)
                if (options[i].get('checked') && !options[i].get('isOptionGroup'))
                    count++;

            return count;
        };

        UIController.prototype.getOptionCount = function() {
            var count = 0;

            var options = this.get('options');

            for (var i in options)
                if (!options[i].get('isOptionGroup'))
                    count++;

            return count;
        };

        UIController.prototype.handleCheckboxClick = function(el) {
            var instanceId = 'data-opt-inst' in el.attributes && el.attributes['data-opt-inst'].value || null;

            // obligatorisch
            if (!instanceId) {
                this.updateContent();
                return;
            }

            var opt = new msOption();
            opt.instanceId = instanceId;

            opt.check(el.checked);

            this.updateContent();
        };

        UIController.prototype.applyValueInput = function() {
            var val     = JSON.parse(this.get('valueInput').value);
            var options = this.get('options');

            for (var i in options)
                if (!options[i].get('disabled') && !options[i].get('isOptionGroup'))
                    options[i].check(!!~val.indexOf(options[i].get('value')));

            this.updateContent();
        };

        UIController.prototype.showDropdown = function() {
            this.set('dropdownIsOpen', true);
            this.get('dropdown').show();
            this.updateContent();

            if (settings.searchBar)
                this.get('searchBar').focus();

            // Hook
            if (settings.onDropdownOpen)
                settings.onDropdownOpen();
        };

        UIController.prototype.hideDropdown = function() {
            this.set('dropdownIsOpen', false);
            this.get('dropdown').hide();

            // Hook
            if (settings.onDropdownClose)
                settings.onDropdownClose();
        };

        UIController.prototype.discardChanges = function() {
            this.applyValueInput();

            if (settings.searchBar)
                this.get('searchBar').value = '';

            // Hook
            if (settings.onDiscard)
                settings.onDiscard();

            this.hideDropdown();
        };

        UIController.prototype.saveChanges = function() {
            var valueInput = this.get('valueInput');
            var options = this.get('options');
            var values = [];

            for (var i in options)
                if (options[i].get('checked') && options[i].get('value'))
                    values.push(options[i].get('value'));

            values = JSON.stringify(values);

            valueInput.value = values;

            this.hideDropdown();
        };

        return UIController;
    })();

    var MultiSelect = (function() {
        var _private = function() {
            return {
                uiControllers: { value: [], type: 'Object', className: 'UIController' },
                settings: { value: null, type: 'Object' },
            };
        };

        var _privateVals = [];

        function MultiSelect(settings) {
            this.className = 'MultiSelect';
            this.instanceId = uniqid();

            _privateVals[this.instanceId] = _private();

            if (typeof settings !== 'undefined')
                this.set('settings', settings);
        };

        // Dynamic get/set/add
        MultiSelect.prototype.get = function(what) { return get(_privateVals[this.instanceId], what) };
        MultiSelect.prototype.set = function(what, value) { return set(_privateVals[this.instanceId], what, value) };
        MultiSelect.prototype.add = function(what, value) { return add(_privateVals[this.instanceId], what, value) };

        MultiSelect.prototype.init = function(selector) {
            var that = this;

            var selects = document.querySelectorAll(selector);

            if (!selects.length)
                throw new MultiSelectException('init: No Selects could be found');

            Array.prototype.forEach.call(selects, function(select, i) {
                var uiController = new UIController(select);
                that.add('uiControllers', uiController);
            });
        };

        MultiSelect.prototype.applyEvents = function() {
            var i;
            var that = this;

            var findController = function(event, closeDropdowns) {
                var uiControllers = that.get('uiControllers');
                var el = event.target;

                var currentElement = el;
                var instanceId     = null;

                while (currentElement && !instanceId) {
                    instanceId = currentElement.attributes['data-inst'] && currentElement.attributes['data-inst'].value || null;
                    currentElement = currentElement.parentElement;
                }

                if (closeDropdowns)
                    for (i in uiControllers)
                        if (uiControllers[i].get('dropdownIsOpen') && uiControllers[i].instanceId !== instanceId)
                            uiControllers[i].discardChanges();

                if (!instanceId)
                    return false;

                var ctrl = new UIController();

                ctrl.instanceId = instanceId;

                return ctrl;
            }

            // Key Handler
            document.addEventListener('keyup', function(event) {
                var keyCode = event.which || event.keyCode;
                var ctrl = findController(event, false);

                if (ctrl)
                    ctrl.updateContent();

                if (keyCode !== 27) // Escape
                    return

                var uiControllers = that.get('uiControllers');

                for (i in uiControllers)
                    if (uiControllers[i].get('dropdownIsOpen'))
                        uiControllers[i].discardChanges();
            });

            // Click Handler
            document.addEventListener('click', function(event) {
                var ctrl = findController(event, true);
                var el = event.target;

                if (!ctrl)
                    return;

                if (el.tagName == 'INPUT' && el.type == 'checkbox') {
                    ctrl.handleCheckboxClick(el);
                    return;
                }

                if (!!~el.className.indexOf('multiselect-button')) {
                    if (!!~el.className.indexOf('multiselect-cancel'))
                        ctrl.discardChanges();
                    else if (!!~el.className.indexOf('multiselect-toggle')) { 
                        ctrl[(ctrl.get('dropdownIsOpen') ? 'hide' : 'show') + 'Dropdown']();
                    } else if (!!~el.className.indexOf('multiselect-save'))
                        ctrl.saveChanges();
                }
            });
        };

        return MultiSelect;
    })();

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // ANWENDUNG ---------------------------------------------------------------------------------------------------- //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var multiSelect = new MultiSelect(settings);

    // Hook
    if (settings.preInit)
        settings.preInit();

    // Warten bis der Inhalt der Seite geladen ist
    ready(function() {
        multiSelect.init(selector);
        multiSelect.applyEvents();

        // Hook
        if (settings.postInit)
            settings.postInit();
    });
});