/* Grammer 
bool -> bool_term {+ bool_term}
bool_term -> bool_factor {^ bool_factor}
bool_factor -> bool_atom {bool_atom}
bool_atom -> bool_atom' | (bool) | var
*/
Token = {
    isWhitespace : function(c){
        switch(c){
            case " ":
            case "\n":
            case "\t":
            case "\r":
            case "\f":
            case "\v":
            case "\0":    
                return true;
        }
        return false;
    },
    
    isVariable : function(c){
        return ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z'));
    },
    
    isOperator : function(c){
        switch(c){
            case "+":
            case "^":
            case "'":
            case "(":
            case ")":
                return true;
        }    
        
        return false;
    }
}

function AndExpression(left, right){    
    this.eval = function(symbol_values){
        return left.eval(symbol_values) && right.eval(symbol_values);
    }
}

function XorExpression(left, right){
    this.eval = function(symbol_values){
        p = left.eval(symbol_values);
        q = right.eval(symbol_values);
        return (p && !q) || (!p && q);
    }    
}

function OrExpression(left, right){
    this.eval = function(symbol_values){
        return left.eval(symbol_values) || right.eval(symbol_values);
    }    
}

function VariableExpression(symbol){
    this.eval = function(symbol_values) { 
        return !!symbol_values[symbol];
    }
}

function NotExpression(unary){
    this.eval = function(symbol_values){
        return !unary.eval(symbol_values);
    }    
}

function Bool(lexer){
    var e = BoolTerm(lexer);
    while(1){
        if(lexer.token() == "+"){
            lexer.match("+");
            e = new OrExpression(e, BoolTerm(lexer));    
        } else {
            break;
        }
    }
    return e;
}

function BoolTerm(lexer){
    var e = BoolFactor(lexer);
    while(1){
        if(lexer.token() == "^"){
            lexer.match("^");
            e = new XorExpression(e, BoolFactor(lexer));
        } else {
            break;
        }
    }
    
    return e;
}

function BoolFactor(lexer){
    var e = BoolAtom(lexer);
    while(1){
        // ANDs can ride up against another variable or a (
        if(Token.isVariable(lexer.token()) || lexer.token() == "("){                                                     
            e = new AndExpression(e, BoolAtom(lexer));
        } else {
            break;
        }
    }
    
    return e;
}

function BoolAtom(lexer){
    var e = null;
     if(Token.isVariable(lexer.token())){
        e = new VariableExpression(lexer.token());
        lexer.match(lexer.token());
    } else if(lexer.token() == "("){
        lexer.match("(");
        e = Bool(lexer);
        lexer.match(")");
    } else {
        lexer.match('  '); // won't match anything, throws missing token exception
    }
    
    // look for negative;
    if(lexer.token() == "'"){
        e = new NotExpression(e);
        lexer.match("'")            
    }
    return e;
}

function InvalidTokenException(tok, position){
    this.position = position;
    this.tok = tok;
    this.toString = function(){ 
        return "Invalid token " + this.tok + " at position " + this.position; 
    }
}

function MissingTokenException(given, expected, position){
    this.position = position;
    this.given = given;
    this.expected = expected;
    this.toString = function(){ 
        return "Missing token. Expected " + this.expected + " at position " + this.position;
    }    
}

function InvalidExpressionException(){
    this.toString = function(){
        return "Invalid Expression";
    }
}

function BooleanExpressionLexer(expr){
    var index = 0;
    var tokens = [];
    
    var parse = function(){
        // find all the tokens and push them on the stack
        for(var i = 0; i < expr.length; i++){
            var tok = expr[i];
            if(Token.isWhitespace(tok)){
                continue;
            } else if(Token.isVariable(tok) || Token.isOperator(tok)){
                tokens.push(tok);
            } else {
                throw new InvalidTokenException(tok, i + 1);
            }
        }
    }
    
    // get the next token on the stack
    this.nextToken = function(){
        return tokens[index++];
    }
    
    // get the current token
    this.token = function(){
        return tokens[index];
    }
    
    // verify the current token matches the specified token, and move to the next token
    this.match = function(c){
        if(c != this.token()){
            throw new MissingTokenException(this.token(), c, index);
        }
        this.nextToken();
    }
    
    this.toString = function(){
        return tokens.toString();
    }
    
    // get a sorted list of all the variables in the expression
    this.variables = function(){
        // use a hash table to eliminate duplicate vars
        var vars = {};
        for(var i = 0; i < tokens.length; i++){
            if(Token.isVariable(tokens[i]))
                vars[tokens[i]] = tokens[i];
        }
        
        // now load the variables into an array
        var vars_array = []
        for(var k in vars){
            vars_array.push(vars[k]);
        }
        vars_array.sort();
        
        return vars_array;
    }
    
    parse();
}
