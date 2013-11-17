$(document).ready(function(){
    $('.panel').hide();
    $('#home-panel').show();
    $('#back').click(function(){
        $('.panel').hide();
        $('#home-panel').show();
        return false; // prevent link from working
    });
    $('#button-expression').click(function(){
        $('.panel').hide();
        $('#expression-panel').show();
        $('#expression-panel-input').select();
        $('#expression-panel-input').focus();
    });
    
    $('#button-truth-table').click(function(){
        $('.panel').hide();        
        $('#truth-table-panel-one').show();
        $('#truth-table-panel-one-input').select();
        $('#truth-table-panel-one-input').focus();        
    });    
    
    $('#button-min-terms').click(function(){
        $('.panel').hide();                                          
        $('#min-terms-panel').show();
        $('#min-terms-panel-input').select();
        $('#min-terms-panel-input').focus();
    });
    
    
    $('#expression-panel-submit').click(function(){
        var input = $('#expression-panel-input').val();
        try {
            var min_terms = MinTerms.fromExpression(input);
        } catch(e) {
            if(e instanceof InvalidTokenException){
                var message = 'Syntax Error: ';
                for(var i = 0; i < input.length; i++){
                    if(i + 1 == e.position){
                        message += "<strong class='error'>" + input[i] + "</strong>";
                    }
                    else
                        message += input[i];
                }
                $('#expression-panel-input-message').html(message);
                $('#expression-panel-input-message').removeClass('hide');
                return;
            } else if(e instanceof MissingTokenException){
                var message = 'Missing Token: ';
                for(var i = 0; i < input.length; i++){
                    if(i + 1 == e.position){
                        message += "<strong class='error'>" + input[i] + "</strong>";
                    }
                    else
                        message += input[i];
                }
                $('#expression-panel-input-message').html(message);
                $('#expression-panel-input-message').removeClass('hide');
                return;                
            } else {
                $('#expression-panel-input-message').html("Invalid Expression!");
                $('#expression-panel-input-message').removeClass('hide');
                return;
            }
        }
        $('#expression-panel-input-message').addClass('hide');        
        $('.panel').hide();
        var f = new BooleanFunction(min_terms);
        
        // draw the output using the variables in the expression
        var vars = SumOfProducts.removeDuplicates(input.replace(/[^a-zA-Z]/g, '').split(''));
        vars.sort();        
        var drawer = new BooleanFunctionOut(f, vars);
        drawer.render();
    });
    
    var termInputStringToArray = function(input){
        if($.trim(input) == "")
            return [];
            
        var terms = input.split(",");
        var output = [];
        for(var i = 0; i < terms.length; i++){
            if($.trim(terms[i]) == "")
                continue;
            // min terms can be input as a range (e.g. 2-6)
            // if they are, we need to add all the terms in the range
            var sub_terms = terms[i].split("-");
            if(sub_terms.length == 2){ // it's a range
                var start = parseInt($.trim(sub_terms[0]), 10);
                var end = parseInt($.trim(sub_terms[1]), 10);
                for(var j = start; j <= end; j++){
                    output.push(j);    
                }
            } else { // not a range, just add the term
                output.push(parseInt($.trim(terms[i]), 10));
            }
        }    
        
        return output;
    }
        
    $('#min-terms-panel-submit').click(function(){
        $('.panel').hide();
        var input = $('#min-terms-panel-input').val();
        var min_terms = termInputStringToArray(input);
        var input = $('#min-terms-panel-input-two').val();
        var dont_cares = termInputStringToArray(input);    
        var min_terms = MinTerms.fromArray(min_terms, dont_cares);
        var f = new BooleanFunction(min_terms);    
        var drawer = new BooleanFunctionOut(f, "abcdefghijklmnopqrstuvwxyz".split("").slice(0, f.getNumberOfVars()));
        drawer.render();
    });
    
    $('#truth-table-panel-one-submit').click(function(){
        $('.panel').hide();
        var input = $('#truth-table-panel-one-input').val();
        var vars_input = input.split(",");
        var vars = [];
        for(var i = 0; i < vars_input.length; i++){
            var v = $.trim(vars_input[i]);
            if(v == "") continue;
            vars.push(v);
        }

        // remove old truth table
        $('#truth-table-panel-two table thead tr').remove();
        $('#truth-table-panel-two table tbody tr').remove();        
        
        // add header
        var table_header = $('<tr>');
        table_header.append("<th>#</th>");
        for(var i = 0; i < vars.length; i++){
            table_header.append("<th>" + vars[i] + "</th>");
        }
        table_header.append("<th>Out</th>");
        $('#truth-table-panel-two table thead').append(table_header);        
        
        // add table body
        var table_body = [];
        for(var iter = new TruthTableIterator(vars), n = 0; iter.hasNext(); n++){
            if(n % 2 == 0)
                table_body.push("<tr class='toggle-me'>");
            else 
                table_body.push("<tr class='odd toggle-me'>");
            var symbol_values = iter.next();
            table_body.push("<th>" + n + "</th>");
            for(var i = 0; i < vars.length; i++){
                table_body.push("<td>");
                table_body.push(symbol_values[vars[i]]);
                table_body.push("</td>");                
            }
            table_body.push("<td  id='mt" + n + "'>0</td>");
            table_body.push("</tr>");            
        }
        $('#truth-table-panel-two-body').html(table_body.join(""));    
        
        // handle the clicks
        $('.toggle-me').live('mousedown', function(){
            var $el = $(this).children("td:last");
            var val = $el.text();
            if(val == "0"){
                $el.text("1");    
                $el.addClass('one');
                $el.removeClass('dont-care');
            } else if(val == "1"){
                $el.text("X");
                $el.addClass('dont-care');    
                $el.removeClass('one');                
            } else {
                $el.text("0");
                $el.removeClass('one');        
                $el.removeClass('dont-care');                
            }
            return false; // prevents the row from highlighting
        });
        $('#truth-table-panel-two').show();            
    });

    $('#truth-table-panel-two-submit').click(function(){
          $('.panel').hide();
        var $ones = $('#truth-table-panel-two-body .one');
        var ones = [];
        for(var i = 0; i < $ones.length; i++){
            ones.push(parseInt($($ones[i]).attr('id').substr(2), 10));
        }
        
        var $dont_cares = $('#truth-table-panel-two-body .dont-care');
        var dont_cares = [];
        for(var i = 0; i < $dont_cares.length; i++){
            dont_cares.push(parseInt($($dont_cares[i]).attr('id').substr(2), 10));
        }        

        var min_terms = MinTerms.fromArray(ones, dont_cares);
        var f = new BooleanFunction(min_terms);    
        var drawer = new BooleanFunctionOut(f, "abcdefghijklmnopqrstuvwxyz".split(""));
        drawer.render();
    });
});


function BooleanFunctionOut(f, vars){
    this.buildTruthTable = function(){
        // remove old truth table
        $('#truth-table-output table thead tr').remove();
        $('#truth-table-output table tbody tr').remove();        
        
        // add header
        var table_header = $('<tr>');
        table_header.append("<th>#</th>");
        for(var i = 0; i < vars.length; i++){
            table_header.append("<th>" + vars[i] + "</th>");
        }
        table_header.append("<th>Out</th>");
        $('#truth-table-output table thead').append(table_header);        
        // add table body
        var table_body = [];
        for(var iter = new TruthTableIterator(vars), n = 0; iter.hasNext(); n++){
            if(n % 2 == 0)
                table_body.push("<tr>");
            else 
                table_body.push("<tr class='odd'>");
            var symbol_values = iter.next();
            table_body.push("<th>" + n + "</th>");
            for(var i = 0; i < vars.length; i++){
                table_body.push("<td>");
                table_body.push(symbol_values[vars[i]]);
                table_body.push("</td>");                
            }
            table_body.push("<td>");
            table_body.push(f.isMinTerm(n) ? 1 : 0);
            table_body.push("</td>");                            
            table_body.push("</tr>");            
        }
        document.getElementById('truth-table-output-body').innerHTML = table_body.join("");    
        $('#output').show();            
    }
    
    this.buildExpressionList = function(){
        var prime_imps = f.findPrimeImplicants();    
        var table = PrimeImplicantTable.build(f.getMinTerms(), prime_imps);    
        var sum_of_prods = SumOfProducts.fromTable(table);
        var solns = SumOfProducts.reduce(sum_of_prods);
        var pretty = SumOfProducts.toSymbols(solns, prime_imps, vars);    
        $('#expressions-output-body tr').remove();
        for(var i = 0; i < pretty.length; i++){
            $('#expressions-output-body').append("<tr><td>" + pretty[i] + "</td></tr>");
        }
        
        f = new BooleanFunction(MinTerms.fromExpression(pretty[0]));
    }
    
    this.buildMinTermList = function(){
        var terms = f.getMinTerms();
        var mins = [];
        for(var i = 0; i < terms.length; i++){
            mins.push(terms[i].covers[0]);
        }
        mins.sort(function(a, b){ return a - b; });
        $('#min-terms-output').text(mins.join(", "));
    }
    
    this.render = function(){
        this.buildExpressionList(); // this comes first!!
        this.buildTruthTable();
        this.buildMinTermList();
    }
    
    // trim excess variables
    vars = vars.slice(0, f.getNumberOfVars());
}


