from flask import Flask, jsonify, render_template, request
import pandas as pd 
import json 

df = pd.read_csv('../../italy-dtp-2017-12.csv', header = 0, names=['days', 'time', 'lat', 'lon', 'discharge', 'temp', 'prec'])
df_drop = df.drop(columns = ['days', 'time', 'discharge', 'temp', 'prec'], inplace=False)
df['coords'] = df_drop.apply(tuple, axis=1)
df_index = df.set_index(['coords', 'time'])

app = Flask(__name__)
@app.route("/plot", methods=['GET'])
def plot():
    args = request.args
    str_c = args.get('coords')
    str_c = str_c.split(',')
    c = (float(str_c[1]), float(str_c[0]))
    for coord, time in df_index.groupby(level=0):
        if coord[0] == c[0] and coord[1] == c[1]:
            return jsonify({"data": df_index.loc[c, :]['discharge'].reset_index(drop=True).values.tolist()})
    return jsonify({"data": []})

@app.route("/")
def index():
 return render_template('index.html')

if __name__ == '__main__':
    app.run()